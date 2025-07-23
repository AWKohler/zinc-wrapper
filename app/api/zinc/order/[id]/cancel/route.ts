import { NextRequest, NextResponse } from 'next/server';
import { getZincClient, ZincAPIError } from '@/lib/zinc/client';
import { db, orders, cancellations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const cancelSchema = z.object({
  merchant_order_id: z.string().min(1),
  webhooks: z.object({
    request_succeeded: z.string().url().optional(),
    request_failed: z.string().url().optional(),
  }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    const validation = cancelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

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

    // Check if order can be cancelled (must be placed)
    if (order.status !== 'placed' && order.status !== 'attempting_to_cancel') {
      return NextResponse.json(
        { error: 'Order cannot be cancelled in current status', currentStatus: order.status },
        { status: 400 }
      );
    }

    const client = getZincClient();
    
    // Get app URL for webhooks if not provided
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;
    const webhooks = validation.data.webhooks || {
      request_succeeded: `${appUrl}/api/webhooks/zinc`,
      request_failed: `${appUrl}/api/webhooks/zinc`,
    };

    // Make cancellation request to Zinc
    const zincResponse = await client.request<{ request_id: string }>({
      path: `/orders/${requestId}/cancel`,
      method: 'POST',
      body: {
        merchant_order_id: validation.data.merchant_order_id,
        webhooks,
      },
    });

    // Store cancellation in database
    const [newCancellation] = await db.insert(cancellations).values({
      orderId: order.id,
      requestId: zincResponse.request_id,
      merchantOrderId: validation.data.merchant_order_id,
      status: 'pending',
      zincPayload: { request: validation.data, response: zincResponse },
    }).returning();

    // Update order status to attempting_to_cancel
    await db.update(orders)
      .set({
        status: 'attempting_to_cancel',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      success: true,
      cancellation_request_id: zincResponse.request_id,
      cancellation_id: newCancellation.id,
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    
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
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}