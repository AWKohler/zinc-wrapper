import { NextRequest, NextResponse } from 'next/server';
import { getZincClient } from '@/lib/zinc/client';
import { z } from 'zod';

const productQuerySchema = z.object({
  asin: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asin = searchParams.get('asin');

    const validation = productQuerySchema.safeParse({ asin });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const client = getZincClient();

    // Fetch product details
    const productDetails = await client.request<any>({
      path: `/products/${asin}?retailer=amazon`,
      method: 'GET',
    });

    return NextResponse.json(productDetails);
  } catch (error: any) {
    console.error('Error fetching product data:', error);
    
    if (error.name === 'ZincAPIError') {
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
      { error: 'Failed to fetch product data' },
      { status: 500 }
    );
  }
}