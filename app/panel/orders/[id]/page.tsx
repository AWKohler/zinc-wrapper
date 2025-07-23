'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft } from 'lucide-react';
import { OrderActionDialogs } from '@/components/order-action-dialogs';

interface OrderEvent {
  id: number;
  eventType: string;
  receivedAt: string;
  rawBody: {
    message?: string;
  };
}

interface OrderDetails {
  order: {
    id: number;
    requestId: string;
    asinList: string[] | null;
    status: string;
    createdAt: string;
    zincPayload: {
      price_components?: {
        subtotal: number;
        shipping: number;
        tax: number;
        total: number;
      };
      tracking?: Array<{
        product_id: string;
        carrier: string;
        tracking_number: string;
        obtained_at: string;
      }>;
      merchant_order_ids?: Array<{ merchant_order_id: string }>;
    } | null;
  };
  events: OrderEvent[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrderDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order details');
      }

      setOrderDetails(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchOrderDetails();
    }
  }, [params.id, fetchOrderDetails]);
  
  useEffect(() => {
    // Poll for updates while order is processing
    if (orderDetails?.order?.status === 'processing' || 
        orderDetails?.order?.status === 'attempting_to_cancel') {
      const interval = setInterval(() => {
        fetchOrderDetails();
      }, 60000); // Every 60 seconds

      return () => clearInterval(interval);
    }
  }, [orderDetails?.order?.status, fetchOrderDetails]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error || 'Order not found'}</p>
          <Button onClick={() => router.push('/panel/orders')} className="mt-4">
            Back to Orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { order, events } = orderDetails;
  const payload = order.zincPayload || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/panel/orders')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        <h1 className="text-2xl font-semibold">Order {order.requestId}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                Created: {formatDate(order.createdAt)}
              </CardDescription>
            </div>
            <Badge>{order.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.asinList && order.asinList.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Products</h4>
              <ul className="list-disc pl-5">
                {order.asinList.map((asin: string, index: number) => (
                  <li key={index}>{asin}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="price">Price</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="border-l-2 pl-4 pb-4">
                    <Badge variant="outline" className="mb-2">
                      {event.eventType}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.receivedAt)}
                    </p>
                    {event.rawBody?.message && (
                      <p className="text-sm mt-1">{event.rawBody.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price">
          <Card>
            <CardHeader>
              <CardTitle>Price Components</CardTitle>
            </CardHeader>
            <CardContent>
              {payload.price_components ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(payload.price_components.subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>${(payload.price_components.shipping / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${(payload.price_components.tax / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>${(payload.price_components.total / 100).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No price information available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle>Tracking Information</CardTitle>
            </CardHeader>
            <CardContent>
              {payload.tracking && payload.tracking.length > 0 ? (
                <div className="space-y-4">
                  {payload.tracking.map((track, index) => (
                    <div key={index} className="border p-4 rounded">
                      <p><strong>Product:</strong> {track.product_id}</p>
                      <p><strong>Carrier:</strong> {track.carrier}</p>
                      <p><strong>Tracking Number:</strong> {track.tracking_number}</p>
                      <p><strong>Obtained:</strong> {formatDate(track.obtained_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tracking information available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Raw JSON Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded overflow-auto max-h-96 text-xs">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderActionDialogs order={order} onActionComplete={fetchOrderDetails} />
        </CardContent>
      </Card>
    </div>
  );
}