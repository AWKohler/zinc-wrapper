'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { Loader2 } from 'lucide-react';

export default function AddProductPage() {
  const router = useRouter();
  const [asin, setAsin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [productDetails, setProductDetails] = useState(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asin.trim()) return;

    setIsLoading(true);
    setError('');
    setProductDetails(null);

    try {
      const response = await fetch(`/api/zinc/product?asin=${encodeURIComponent(asin)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product details');
      }

      setProductDetails(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCheckout = (product: any) => {
    // Store product in session storage and navigate to checkout
    sessionStorage.setItem('checkoutProduct', JSON.stringify(product));
    router.push('/panel/checkout');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Product</CardTitle>
          <CardDescription>
            Enter an Amazon ASIN to look up product details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex gap-4">
            <Input
              type="text"
              placeholder="Enter ASIN (e.g., B07986PWD3)"
              value={asin}
              onChange={(e) => setAsin(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !asin.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Looking up...
                </>
              ) : (
                'Look up'
              )}
            </Button>
          </form>
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {productDetails && (
        <ProductCard
          productDetails={productDetails}
          onAddToCheckout={handleAddToCheckout}
        />
      )}
    </div>
  );
}