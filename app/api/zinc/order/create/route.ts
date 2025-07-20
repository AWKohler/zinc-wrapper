import { NextRequest, NextResponse } from 'next/server';
import { getZincClient, ZincAPIError } from '@/lib/zinc/client';
import { db, orders } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const shippingAddressSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  address_line1: z.string().min(1),
  address_line2: z.string().optional().default(''),
  zip_code: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1).default('US'),
  phone_number: z.string().min(1),
});

const createOrderSchema = z.object({
  products: z.array(z.object({
    product_id: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
  shipping_address: shippingAddressSchema,
  max_price: z.number().positive(),
  is_gift: z.boolean().default(false),
  gift_message: z.string().optional(),
  shipping_method: z.enum(['cheapest', 'fastest']).default('cheapest'),
  user_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const client = getZincClient();
    
    // Generate idempotency key
    const idempotencyKey = uuidv4();
    
    // Get app URL for webhooks
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;
    
    // Prepare Zinc order payload
    const zincOrderPayload = {
      retailer: 'amazon',
      products: data.products,
      shipping_address: data.shipping_address,
      shipping_method: data.shipping_method,
      max_price: data.max_price,
      is_gift: data.is_gift,
      gift_message: data.gift_message,
      addax: true, // ZMA order
      idempotency_key: idempotencyKey,
      webhooks: {
        request_succeeded: `${appUrl}/api/webhooks/zinc`,
        request_failed: `${appUrl}/api/webhooks/zinc`,
        tracking_updated: `${appUrl}/api/webhooks/zinc`,
        tracking_obtained: `${appUrl}/api/webhooks/zinc`,
        status_updated: `${appUrl}/api/webhooks/zinc`,
        case_updated: `${appUrl}/api/webhooks/zinc`,
      },
    };

    // Create order in Zinc
    const zincResponse = await client.request<{ request_id: string }>({
      path: '/orders',
      method: 'POST',
      body: zincOrderPayload,
    });

    // Extract ASINs from products
    const asinList = data.products.map(p => p.product_id);

    // Store order in database
    const [newOrder] = await db.insert(orders).values({
      requestId: zincResponse.request_id,
      asinList,
      userId: data.user_id,
      status: 'processing',
      zincPayload: zincOrderPayload,
      idempotencyKey,
    }).returning();

    return NextResponse.json({
      success: true,
      request_id: zincResponse.request_id,
      order_id: newOrder.id,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    
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
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}