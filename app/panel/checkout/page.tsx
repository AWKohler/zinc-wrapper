'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    quantity: 1,
    shipping_address: {
      first_name: '',
      last_name: '',
      address_line1: '',
      address_line2: '',
      zip_code: '',
      city: '',
      state: '',
      country: 'US',
      phone_number: '',
    },
    shipping_method: 'cheapest',
    is_gift: false,
    gift_message: '',
    max_price: 100000, // $1000 default
  });

  useEffect(() => {
    // Get product from session storage
    const storedProduct = sessionStorage.getItem('checkoutProduct');
    if (storedProduct) {
      setProduct(JSON.parse(storedProduct));
    } else {
      // No product, redirect back
      router.push('/panel');
    }
  }, [router]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const orderData = {
        products: [{
          product_id: product.product_id,
          quantity: formData.quantity,
        }],
        shipping_address: formData.shipping_address,
        max_price: formData.max_price,
        is_gift: formData.is_gift,
        gift_message: formData.is_gift ? formData.gift_message : undefined,
        shipping_method: formData.shipping_method,
      };

      const response = await fetch('/api/zinc/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Clear product from session and redirect to order details
      sessionStorage.removeItem('checkoutProduct');
      router.push(`/panel/orders/${data.request_id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      {/* Product Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <img
              src={product.main_image}
              alt={product.title}
              className="w-24 h-24 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold">{product.title}</h3>
              <p className="text-sm text-muted-foreground">ASIN: {product.product_id}</p>
              <div className="mt-2 flex items-center gap-4">
                <Label htmlFor="quantity">Quantity:</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.shipping_address.first_name}
              onChange={(e) => handleInputChange('shipping_address.first_name', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formData.shipping_address.last_name}
              onChange={(e) => handleInputChange('shipping_address.last_name', e.target.value)}
              required
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              value={formData.shipping_address.address_line1}
              onChange={(e) => handleInputChange('shipping_address.address_line1', e.target.value)}
              required
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
            <Input
              id="address_line2"
              value={formData.shipping_address.address_line2}
              onChange={(e) => handleInputChange('shipping_address.address_line2', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.shipping_address.city}
              onChange={(e) => handleInputChange('shipping_address.city', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.shipping_address.state}
              onChange={(e) => handleInputChange('shipping_address.state', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="zip_code">ZIP Code</Label>
            <Input
              id="zip_code"
              value={formData.shipping_address.zip_code}
              onChange={(e) => handleInputChange('shipping_address.zip_code', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.shipping_address.phone_number}
              onChange={(e) => handleInputChange('shipping_address.phone_number', e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Shipping Options */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={formData.shipping_method}
            onValueChange={(value) => handleInputChange('shipping_method', value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cheapest" id="cheapest" />
              <Label htmlFor="cheapest">Cheapest Shipping</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fastest" id="fastest" />
              <Label htmlFor="fastest">Fastest Shipping</Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="max_price">Maximum Price (cents)</Label>
            <Input
              id="max_price"
              type="number"
              value={formData.max_price}
              onChange={(e) => handleInputChange('max_price', parseInt(e.target.value) || 0)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Current: ${(formData.max_price / 100).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gift Options */}
      <Card>
        <CardHeader>
          <CardTitle>Gift Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_gift"
              checked={formData.is_gift}
              onCheckedChange={(checked) => handleInputChange('is_gift', checked)}
            />
            <Label htmlFor="is_gift">This is a gift</Label>
          </div>
          
          {formData.is_gift && (
            <div>
              <Label htmlFor="gift_message">Gift Message</Label>
              <Textarea
                id="gift_message"
                value={formData.gift_message}
                onChange={(e) => handleInputChange('gift_message', e.target.value)}
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/panel')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Order...
            </>
          ) : (
            'Place Order'
          )}
        </Button>
      </div>
    </form>
  );
}