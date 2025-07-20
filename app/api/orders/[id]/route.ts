import { NextRequest, NextResponse } from 'next/server';
import { db, orders, zincEvents } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;
    
    // Find order by request_id
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
    
    // Get all events for this order
    const events = await db.select()
      .from(zincEvents)
      .where(eq(zincEvents.orderId, order.id))
      .orderBy(desc(zincEvents.receivedAt));
    
    return NextResponse.json({
      order,
      events,
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}