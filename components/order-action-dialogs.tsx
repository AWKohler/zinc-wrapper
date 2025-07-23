'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

interface OrderActionDialogsProps {
  order: {
    requestId: string;
    status: string;
    zincPayload: {
      merchant_order_ids?: Array<{ merchant_order_id: string }>;
      request?: {
        products?: Array<{ product_id: string; quantity?: number }>;
      };
      [key: string]: unknown;
    } | null;
  };
  onActionComplete: () => void;
}

export function OrderActionDialogs({ order, onActionComplete }: OrderActionDialogsProps) {
  const [isAbortOpen, setIsAbortOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isCaseOpen, setIsCaseOpen] = useState(false);
  const [isRetryOpen, setIsRetryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Cancel form state
  const [selectedMerchantOrderId, setSelectedMerchantOrderId] = useState('');

  // Return form state
  const [returnProducts, setReturnProducts] = useState<Array<{ product_id: string; quantity: number }>>([]);
  const [returnReason, setReturnReason] = useState('inaccurate website description');
  const [returnMethod, setReturnMethod] = useState('UPS Dropoff');
  const [returnExplanation, setReturnExplanation] = useState('');

  // Case form state
  const [caseReason, setCaseReason] = useState<string>('');
  const [caseMessage, setCaseMessage] = useState('');
  const [isNewCase] = useState(true);

  const merchantOrderIds = order.zincPayload?.merchant_order_ids || [];
  const products = order.zincPayload?.request?.products || [];

  // Abort Order
  const handleAbort = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/zinc/order/${order.requestId}/abort`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to abort order');
      }

      setIsAbortOpen(false);
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Retry Order
  const handleRetry = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/zinc/order/${order.requestId}/retry`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry order');
      }

      setIsRetryOpen(false);
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel Order
  const handleCancel = async () => {
    if (!selectedMerchantOrderId) {
      setError('Please select an order to cancel');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/zinc/order/${order.requestId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_order_id: selectedMerchantOrderId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      setIsCancelOpen(false);
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Return Order
  const handleReturn = async () => {
    if (returnProducts.length === 0) {
      setError('Please select products to return');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/zinc/order/${order.requestId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: returnProducts,
          reason_code: returnReason,
          method_code: returnMethod,
          explanation: returnExplanation,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create return');
      }

      setIsReturnOpen(false);
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Case Management
  const handleCase = async () => {
    if (!caseMessage) {
      setError('Please enter a message');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const body: Record<string, string> = { message: caseMessage };
      if (isNewCase && caseReason) {
        body.reason = caseReason;
      }

      const response = await fetch(`/api/zinc/order/${order.requestId}/case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create/update case');
      }

      setIsCaseOpen(false);
      setCaseMessage('');
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize return products based on order products
  const initializeReturnProducts = () => {
    if (products.length > 0 && returnProducts.length === 0) {
      setReturnProducts(
        products.map((p) => ({
          product_id: p.product_id,
          quantity: p.quantity || 1,
        }))
      );
    }
  };

  return (
    <>
      {/* Abort Dialog */}
      {order.status === 'processing' && (
        <Dialog open={isAbortOpen} onOpenChange={setIsAbortOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Abort Order</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abort Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to abort this order? This action will attempt to stop the order before it completes.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAbortOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleAbort} disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aborting...</> : 'Abort Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Dialog */}
      {merchantOrderIds.length > 0 && (order.status === 'placed' || order.status === 'attempting_to_cancel') && (
        <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Cancel Order</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>
                Select which Amazon order to cancel. Each order must be cancelled separately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <RadioGroup value={selectedMerchantOrderId} onValueChange={setSelectedMerchantOrderId}>
                {merchantOrderIds.map((moi) => (
                  <div key={moi.merchant_order_id} className="flex items-center space-x-2">
                    <RadioGroupItem value={moi.merchant_order_id} id={moi.merchant_order_id} />
                    <Label htmlFor={moi.merchant_order_id} className="cursor-pointer">
                      {moi.merchant_order_id}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={isLoading}>
                Close
              </Button>
              <Button onClick={handleCancel} disabled={isLoading || !selectedMerchantOrderId}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</> : 'Cancel Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Return Dialog */}
      {(order.status === 'placed' || order.status === 'delivered') && (
        <Dialog open={isReturnOpen} onOpenChange={(open) => {
          setIsReturnOpen(open);
          if (open) initializeReturnProducts();
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">Request Return</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Return</DialogTitle>
              <DialogDescription>
                Select products to return and provide return details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Products to Return</Label>
                <div className="space-y-2 mt-2">
                  {returnProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="flex-1">{product.product_id}</span>
                      <Input
                        type="number"
                        min="0"
                        max={products[index]?.quantity || 1}
                        value={product.quantity}
                        onChange={(e) => {
                          const newProducts = [...returnProducts];
                          newProducts[index].quantity = parseInt(e.target.value) || 0;
                          setReturnProducts(newProducts);
                        }}
                        className="w-20"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="reason">Return Reason</Label>
                <Input
                  id="reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g., inaccurate website description"
                />
              </div>

              <div>
                <Label htmlFor="method">Return Method</Label>
                <Input
                  id="method"
                  value={returnMethod}
                  onChange={(e) => setReturnMethod(e.target.value)}
                  placeholder="e.g., UPS Dropoff"
                />
              </div>

              <div>
                <Label htmlFor="explanation">Explanation</Label>
                <Textarea
                  id="explanation"
                  value={returnExplanation}
                  onChange={(e) => setReturnExplanation(e.target.value)}
                  placeholder="Additional details for the seller"
                  rows={3}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReturnOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleReturn} disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Request Return'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Case Dialog */}
      <Dialog open={isCaseOpen} onOpenChange={setIsCaseOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Open Case</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNewCase ? 'Open New Case' : 'Update Case'}</DialogTitle>
            <DialogDescription>
              {isNewCase ? 'Open a support case for this order' : 'Add a message to the existing case'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isNewCase && (
              <div>
                <Label htmlFor="case-reason">Reason</Label>
                <RadioGroup value={caseReason} onValueChange={setCaseReason}>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="return.request_label" id="r1" />
                      <Label htmlFor="r1">Request return label</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nondelivery.not_delivered" id="r2" />
                      <Label htmlFor="r2">Package not delivered</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nondelivery.damaged" id="r3" />
                      <Label htmlFor="r3">Item damaged</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tracking.request_update" id="r4" />
                      <Label htmlFor="r4">Request update</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="r5" />
                      <Label htmlFor="r5">Other</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div>
              <Label htmlFor="case-message">Message</Label>
              <Textarea
                id="case-message"
                value={caseMessage}
                onChange={(e) => setCaseMessage(e.target.value)}
                placeholder="Describe your issue..."
                rows={4}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCaseOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleCase} disabled={isLoading || !caseMessage}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry Dialog */}
      {order.status === 'failed' && (
        <Dialog open={isRetryOpen} onOpenChange={setIsRetryOpen}>
          <DialogTrigger asChild>
            <Button>Retry Order</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Retry Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to retry this failed order? The order will be requeued for processing.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRetryOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleRetry} disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retrying...</> : 'Retry Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}