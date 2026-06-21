'use client';

import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { purchase, OrderResultStatus } from '@devvit/web/client';

// The SKU for the linguil+ product.
const LINGUIL_PLUS_SKU = "linguil_plus";

// Defines the props for the PaymentMethodSelector component.
interface PaymentMethodSelectorProps {
  onStripeSelected: () => void;
  onOpenChange: (open: boolean) => void;
  onPurchaseSuccess: () => Promise<void>;
}

// Renders buttons for the user to choose a payment method.
export const PaymentMethodSelector = ({ onStripeSelected, onOpenChange, onPurchaseSuccess }: PaymentMethodSelectorProps) => {
  // Manages the loading state during payment processing.
  const [isLoading, setIsLoading] = useState(false);
  // Stores any error messages that occur during payment.
  const [error, setError] = useState<string | null>(null);

  // Handles the payment flow when the user chooses Reddit Gold.
  const handleRedditGoldPayment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await purchase(LINGUIL_PLUS_SKU);
      // If the purchase is not successful, display an error.
      if (result.status !== OrderResultStatus.STATUS_SUCCESS) {
        setError(result.errorMessage || 'An unknown error occurred.');
      } else {
        // On success, call the success handler and close the dialog.
        await onPurchaseSuccess();
        onOpenChange(false);
      }
    } catch (_err) {
      setError('An unexpected error occurred.');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-2 items-center">
      {/* Button to initiate a payment with Reddit Gold. */}
      <Button onClick={handleRedditGoldPayment} disabled={isLoading} className="w-full">
        {isLoading ? 'Processing...' : 'Pay with Reddit Gold'}
      </Button>
      {/* Button to open the Stripe payment dialog. */}
      <Button onClick={onStripeSelected} className="w-full">
        Pay with Stripe
      </Button>
      {/* Display any payment-related errors. */}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
};