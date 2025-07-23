import { NextRequest, NextResponse } from 'next/server';
import { getZincClient, ZincAPIError } from '@/lib/zinc/client';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    // Find the order in our database
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.requestId, requestId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order can be retried (must be failed)
    if (order.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed orders can be retried', currentStatus: order.status },
        { status: 400 }
      );
    }

    const client = getZincClient();

    // Retry the order
    const zincResponse = await client.request({
      path: `/orders/${requestId}/retry`,
      method: 'POST',
    });

    // Update order status back to processing
    await db.update(orders)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      success: true,
      message: 'Order retry initiated',
      response: zincResponse,
    });
  } catch (error) {
    console.error('Error retrying order:', error);
    
    if (error instanceof ZincAPIError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          data: error.data
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retry order' },
      { status: 500 }
    );
  }
}