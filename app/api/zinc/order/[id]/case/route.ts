import { NextRequest, NextResponse } from 'next/server';
import { getZincClient, ZincAPIError } from '@/lib/zinc/client';
import { db, orders, cases } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Schema for creating/updating a case
const caseSchema = z.object({
  reason: z.enum([
    'return.request_label',
    'nondelivery.not_delivered',
    'nondelivery.damaged',
    'nondelivery.empty_box',
    'tracking.request_update',
    'cancel.forced_cancellation',
    'other'
  ]).optional(),
  message: z.string().min(1),
});

// GET - Check case status
export async function GET(
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

    const client = getZincClient();

    // Get case status from Zinc
    // Note: Zinc uses order_id (which is their internal ID) not request_id for cases
    // We need to get the order_id from the zinc payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderId = (order.zincPayload as any)?.order_id || requestId;
    
    const caseResponse = await client.request({
      path: `/orders/${orderId}/case`,
      method: 'GET',
    }) as { state?: string; case_id?: string; [key: string]: unknown };

    // Check if we have a case in our database
    const [existingCase] = await db.select()
      .from(cases)
      .where(eq(cases.orderId, order.id))
      .limit(1);

    // Update or create case record
    if (existingCase) {
      await db.update(cases)
        .set({
          status: caseResponse.state || 'open',
          zincPayload: caseResponse,
          updatedAt: new Date(),
        })
        .where(eq(cases.id, existingCase.id));
    } else if (caseResponse.state) {
      // Case exists on Zinc but not in our DB
      await db.insert(cases).values({
        orderId: order.id,
        caseId: caseResponse.case_id || null,
        status: caseResponse.state,
        zincPayload: caseResponse,
      });
    }

    return NextResponse.json(caseResponse);
  } catch (error) {
    console.error('Error checking case:', error);
    
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
      { error: 'Failed to check case' },
      { status: 500 }
    );
  }
}

// POST - Create or update a case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    const validation = caseSchema.safeParse(body);
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

    const client = getZincClient();
    
    // Get the order_id from zinc payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderId = (order.zincPayload as any)?.order_id || requestId;

    // Create or update case
    const casePayload: Record<string, string> = {
      message: validation.data.message,
    };
    
    if (validation.data.reason) {
      casePayload.reason = validation.data.reason;
    }

    const caseResponse = await client.request({
      path: `/orders/${orderId}/case`,
      method: 'POST',
      body: casePayload,
    }) as { state?: string; case_id?: string; [key: string]: unknown };

    // Check if we have a case in our database
    const [existingCase] = await db.select()
      .from(cases)
      .where(eq(cases.orderId, order.id))
      .limit(1);

    if (existingCase) {
      // Update existing case
      await db.update(cases)
        .set({
          status: caseResponse.state || 'open',
          zincPayload: caseResponse,
          updatedAt: new Date(),
        })
        .where(eq(cases.id, existingCase.id));
    } else {
      // Create new case record
      await db.insert(cases).values({
        orderId: order.id,
        caseId: caseResponse.case_id || null,
        status: caseResponse.state || 'open',
        zincPayload: caseResponse,
      });
    }

    return NextResponse.json({
      success: true,
      case: caseResponse,
    });
  } catch (error) {
    console.error('Error creating/updating case:', error);
    
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
      { error: 'Failed to create/update case' },
      { status: 500 }
    );
  }
}