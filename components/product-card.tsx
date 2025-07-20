'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ProductDetails {
  product_id: string;
  title: string;
  product_details: string[];
  main_image: string;
  price?: number;
  retailer: string;
}

interface ProductCardProps {
  productDetails: ProductDetails;
  onAddToCheckout: (product: ProductDetails) => void;
}

export function ProductCard({ productDetails, onAddToCheckout }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCheckout = () => {
    setIsAdding(true);
    onAddToCheckout(productDetails);
    // Reset after a short delay
    setTimeout(() => setIsAdding(false), 1000);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="line-clamp-2">{productDetails.title}</CardTitle>
        <CardDescription>ASIN: {productDetails.product_id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-square w-full overflow-hidden rounded-md">
          <img
            src={productDetails.main_image}
            alt={productDetails.title}
            className="h-full w-full object-cover"
          />
        </div>
        {productDetails.product_details && productDetails.product_details.length > 0 && (
          <ul className="text-sm text-muted-foreground space-y-1">
            {productDetails.product_details.slice(0, 3).map((detail, index) => (
              <li key={index} className="line-clamp-1">• {detail}</li>
            ))}
          </ul>
        )}
        {productDetails.price && (
          <p className="text-lg font-semibold">
            ${(productDetails.price / 100).toFixed(2)}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAddToCheckout}
          disabled={isAdding}
          className="w-full"
        >
          {isAdding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add to Checkout'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}