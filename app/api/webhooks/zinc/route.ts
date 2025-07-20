import { NextRequest, NextResponse } from 'next/server';
import { db, orders, zincEvents } from '@/lib/db';
import { eq } from 'drizzle-orm';

function deriveOrderStatus(webhook: any): string {
  const type = webhook._type;
  const code = webhook.code;

  // Handle error responses
  if (type === 'error') {
    if (code === 'aborted_request') {
      return 'aborted';
    }
    return 'failed';
  }

  // Handle successful order responses
  if (type === 'order_response') {
    // Check if attempting to cancel
    if (webhook.attempting_to_cancel) {
      return 'attempting_to_cancel';
    }
    
    // Check if delivered (all tracking shows delivered)
    if (webhook.tracking && webhook.tracking.length > 0) {
      const allDelivered = webhook.tracking.every((t: any) => 
        t.status === 'delivered' || t.delivered === true
      );
      if (allDelivered) {
        return 'delivered';
      }
    }
    
    // Otherwise it's placed
    return 'placed';
  }

  return 'processing';
}

function determineEventType(path: string, webhook: any): string {
  // Try to determine from the webhook URL or content
  if (webhook._type === 'error') {
    return 'request_failed';
  }
  
  if (webhook._type === 'order_response') {
    if (webhook.tracking && webhook.tracking.length > 0) {
      return 'tracking_updated';
    }
    return 'request_succeeded';
  }

  // Check for case updates
  if (webhook.case || webhook.case_id) {
    return 'case_updated';
  }

  return 'status_updated';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract request_id from the webhook payload
    const requestId = body.request_id || body.request?.request_id;
    
    if (!requestId) {
      console.error('Webhook missing request_id:', body);
      return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
    }

    // Find the order by request_id
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.requestId, requestId))
      .limit(1);

    if (!order) {
      console.error('Order not found for request_id:', requestId);
      // Still return 200 to prevent Zinc from retrying
      return NextResponse.json({ received: true });
    }

    // Determine event type
    const eventType = determineEventType(request.url, body);

    // Insert the webhook event
    await db.insert(zincEvents).values({
      orderId: order.id,
      eventType: eventType as any,
      rawBody: body,
    });

    // Update order status and payload
    const newStatus = deriveOrderStatus(body);
    
    await db.update(orders)
      .set({
        status: newStatus as any,
        zincPayload: body,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Return success quickly (within 2 seconds as per requirements)
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Zinc from retrying on our errors
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}