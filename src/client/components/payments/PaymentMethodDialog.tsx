'use client';

import { useState, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/client/components/ui/dialog';
import { VisuallyHidden } from '@/client/components/ui/visually-hidden';
import { PaymentMethodSelector } from '@/client/components/payments/PaymentMethodSelector';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';

// Lazily load the Stripe payment dialog to reduce the initial bundle size.
const StripePaymentDialog = lazy(() => import('./StripePaymentDialog').then(mod => ({ default: mod.StripePaymentDialog })));

// Defines the props for the PaymentMethodDialog component.
interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseSuccess: () => Promise<void>;
}

// Displays a dialog for the user to choose a payment method.
export const PaymentMethodDialog = ({ open, onOpenChange, onPurchaseSuccess }: PaymentMethodDialogProps) => {
  // Manages the visibility of the Stripe payment dialog.
  const [showStripeDialog, setShowStripeDialog] = useState(false);

  // Hides the current dialog and shows the Stripe dialog when Stripe is selected.
  const handleStripeSelected = () => {
    onOpenChange(false);
    setShowStripeDialog(true);
  };

  return (
    <>
      {/* The main dialog for selecting a payment method. */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Unlock linguil+</DialogTitle>
              <VisuallyHidden>
                <DialogDescription>
                  Choose a payment method to unlock unlimited, offline games.
                </DialogDescription>
              </VisuallyHidden>
            </DialogHeader>
            <p className="mb-2 mt-2">Unlimited, offline games</p>
            <p className="text-sm text-muted-foreground mb-4 italic">
              Note: Offline games do not affect leaderboards.
            </p>
            <PaymentMethodSelector onStripeSelected={handleStripeSelected} onOpenChange={onOpenChange} onPurchaseSuccess={onPurchaseSuccess} />
        </DialogContent>
      </Dialog>

      {/* Conditionally render the Stripe dialog with a loading fallback. */}
      {showStripeDialog && <Suspense fallback={
        <Dialog open={true}>
          <DialogContent hideCloseButton className="sm:max-w-xs">
            <div className="flex items-center justify-center h-[244px]">
              <VisuallyHidden>
                <DialogTitle>Unlock linguil+</DialogTitle>
                <DialogDescription>Loading payment dialog</DialogDescription>
              </VisuallyHidden>
              <LoadingSpinner />
            </div>
          </DialogContent>
        </Dialog>
      }><StripePaymentDialog open={showStripeDialog} onOpenChange={setShowStripeDialog} /></Suspense>}
    </>
  );
};