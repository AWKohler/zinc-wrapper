import { NextRequest, NextResponse } from 'next/server';
import { getZincClient, ZincAPIError } from '@/lib/zinc/client';
import { db, orders, returns } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const returnSchema = z.object({
  products: z.array(z.object({
    product_id: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
  reason_code: z.string().min(1),
  method_code: z.string().min(1),
  explanation: z.string().min(1),
  cancel_pending: z.boolean().optional().default(false),
  return_address: z.object({
    first_name: z.string(),
    last_name: z.string(),
    address_line1: z.string(),
    address_line2: z.string().optional(),
    zip_code: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    phone_number: z.string().optional(),
  }).optional(),
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
    
    const validation = returnSchema.safeParse(body);
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

    // Check if order can have returns (must be placed or delivered)
    if (order.status !== 'placed' && order.status !== 'delivered') {
      return NextResponse.json(
        { error: 'Returns can only be requested for placed or delivered orders', currentStatus: order.status },
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

    // Make return request to Zinc
    const returnPayload = {
      ...validation.data,
      webhooks,
    };

    const zincResponse = await client.request<{ request_id: string }>({
      path: `/orders/${requestId}/return`,
      method: 'POST',
      body: returnPayload,
    });

    // Store return request in database
    const [newReturn] = await db.insert(returns).values({
      orderId: order.id,
      requestId: zincResponse.request_id,
      status: 'pending',
      zincPayload: { request: returnPayload, response: zincResponse },
    }).returning();

    return NextResponse.json({
      success: true,
      return_request_id: zincResponse.request_id,
      return_id: newReturn.id,
    });
  } catch (error) {
    console.error('Error creating return:', error);
    
    if (error instanceof ZincAPIError) {
      // Check for return_in_progress error
      if (error.code === 'return_in_progress' && error.data) {
        return NextResponse.json(
          { 
            error: error.message,
            code: error.code,
            status: error.data,
            message: 'A return is already in progress for this order'
          },
          { status: 409 }
        );
      }
      
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
      { error: 'Failed to create return' },
      { status: 500 }
    );
  }
}