'use client';

import { buttonVariants } from '@/client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/client/components/ui/dialog';
import { VisuallyHidden } from '@/client/components/ui/visually-hidden';
import { cn } from '@/client/lib/utils';

// Stripe Price IDs.
const FIXED_PRICE_ID = "price_1SVxX3IpjjTFqpDKAFZWKyXy";
const CUSTOM_PRICE_ID = "price_1SVxX3IpjjTFqpDKNYOhCteE";

// Props for PaymentDialog.
interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Presents links to the checkout page, ensuring reliable redirection on all browsers.
export const StripePaymentDialog = ({ open, onOpenChange }: PaymentDialogProps) => {

  // Renders the payment dialog.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="sm:max-w-xs">
          {/* Dialog header. */}
          <DialogHeader>
            <DialogTitle>linguil+</DialogTitle>
            {/* Accessibility description. */}
            <VisuallyHidden>
              <DialogDescription>
                Choose a payment option to unlock unlimited, offline games. You can choose a fixed price or a custom contribution.
              </DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          {/* Dialog main content. */}
          <p className="mb-2 mt-2">Unlimited, offline games</p>
          <p className="text-sm text-muted-foreground mb-4 italic">
            Note: Offline games do not affect leaderboards.
          </p>
          
          {/* Payment links styled as buttons. */}
          <div className="flex flex-col gap-2 items-center">
            {/* Fixed price option link. */}
            <a 
              href={`/checkout?priceId=${FIXED_PRICE_ID}&type=fixed`}
              className={cn(buttonVariants(), 'w-full')}
              aria-disabled={!FIXED_PRICE_ID}
              onClick={(e) => {
                if (!FIXED_PRICE_ID) e.preventDefault();
                onOpenChange(false);
              }}
            >
              Unlock
            </a>
            {/* Custom/donation price option link. */}
            <a 
              href={`/checkout?priceId=${CUSTOM_PRICE_ID}&type=custom`}
              className={cn(buttonVariants(), 'w-full')}
              aria-disabled={!CUSTOM_PRICE_ID}
              onClick={(e) => {
                if (!CUSTOM_PRICE_ID) e.preventDefault();
                onOpenChange(false);
              }}
            >
              Unlock + donate
            </a>
          </div>
      </DialogContent>
    </Dialog>
  );
};

// Sets display name for debugging.
StripePaymentDialog.displayName = 'PaymentDialog';