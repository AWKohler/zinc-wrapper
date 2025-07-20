import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    const ordersList = await db.select()
      .from(orders)
      .where(userId ? eq(orders.userId, userId) : undefined)
      .orderBy(desc(orders.createdAt));
    
    return NextResponse.json(ordersList);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}