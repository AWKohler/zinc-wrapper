import { NextRequest, NextResponse } from 'next/server';
import { getZincClient, ZincAPIError } from '@/lib/zinc/client';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// No body needed for abort request, just the request_id from the URL
const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    
    // Validate the request_id parameter
    const validation = paramsSchema.safeParse({ id: requestId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request ID', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    // Check if order exists in database
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.requestId, requestId))
      .limit(1);

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is in a state that can be aborted
    if (['delivered', 'failed', 'aborted', 'cancelled'].includes(existingOrder.status)) {
      return NextResponse.json(
        { 
          error: 'Order cannot be aborted',
          reason: `Order is already ${existingOrder.status}`
        },
        { status: 400 }
      );
    }

    const client = getZincClient();
    
    // Make request to Zinc API to abort the order
    const zincResponse = await client.request<{
      request_id: string;
      message?: string;
      success?: boolean;
    }>({
      path: `/orders/${requestId}/abort`,
      method: 'POST',
    });

    // Update order status in database
    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        status: 'aborted',
        updatedAt: new Date()
      })
      .where(eq(orders.requestId, requestId))
      .returning();

    return NextResponse.json({
      success: true,
      request_id: requestId,
      order_id: updatedOrder.id,
      status: 'aborted',
      zinc_response: zincResponse,
    });
  } catch (error) {
    console.error('Error aborting order:', error);
    
    if (error instanceof ZincAPIError) {
      // Handle specific Zinc API errors
      let statusCode = error.status || 500;
      let errorMessage = error.message;
      
      // Map common Zinc error codes
      if (error.code === 'order_not_found') {
        statusCode = 404;
        errorMessage = 'Order not found in Zinc';
      } else if (error.code === 'order_already_completed' || error.code === 'order_cannot_be_aborted') {
        statusCode = 400;
        errorMessage = 'Order cannot be aborted at this stage';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: error.code,
          data: error.data
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to abort order' },
      { status: 500 }
    );
  }
}