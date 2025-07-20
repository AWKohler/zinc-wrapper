'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface Order {
  id: number;
  requestId: string;
  asinList: string[] | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  zincPayload: {
    price_components?: {
      total: number;
    };
  } | null;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      setOrders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'processing':
        return 'default';
      case 'placed':
        return 'secondary';
      case 'delivered':
        return 'success';
      case 'failed':
      case 'aborted':
        return 'destructive';
      case 'attempting_to_cancel':
      case 'cancelled':
        return 'outline';
      default:
        return 'default';
    }
  };

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

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchOrders} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Orders</CardTitle>
          <CardDescription>
            You haven&apos;t placed any orders yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/panel')}>
            Add Product
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Button onClick={fetchOrders} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Card 
            key={order.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/panel/orders/${order.requestId}`)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    Order {order.requestId}
                  </CardTitle>
                  <CardDescription>
                    Created: {formatDate(order.createdAt)}
                  </CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(order.status) as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | undefined}>
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.asinList && order.asinList.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Products:</span>{' '}
                    {order.asinList.join(', ')}
                  </div>
                )}
                {order.zincPayload?.price_components && (
                  <div className="text-sm">
                    <span className="font-medium">Total:</span>{' '}
                    ${(order.zincPayload.price_components.total / 100).toFixed(2)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}