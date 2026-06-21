'use client';

import { useEffect, Suspense } from 'react';
import { usePayments } from '@/client/hooks/use-payments';
import { useToast } from '@/client/hooks/use-toast';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';

// Handles the creation of a Stripe checkout session and redirects the user to the Stripe page.
function CheckoutPage() {
  // Custom hooks for payment processing and toasts.
  const { createCheckoutSession, error } = usePayments();
  const { toast } = useToast();

  // Shows a toast message on payment error.
  useEffect(() => {
    if (error) {
      toast({
        title: 'Payment Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Triggers the checkout session creation when the page loads.
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const priceId = searchParams.get('priceId');
    const type = searchParams.get('type');

    // Checks if price ID is configured.
    if (priceId && priceId !== 'undefined') {
      // Constructs success URL for post-payment redirect.
      let successUrl = `${window.location.origin}/`; // Redirect to homepage.
      
      // Appends query params for fixed price post-payment handling.
      if (type === 'fixed') {
        successUrl += '?value=1.99&currency=USD'; // Default currency is USD.
      }
      
      // Creates a Stripe Checkout session and handles the redirect to the Stripe URL.
      createCheckoutSession(priceId, successUrl);

    } else {
      // Shows error toast if Price ID is not set up.
      toast({
        title: 'Configuration error',
        description: 'Payment processing is not set up correctly',
        variant: 'destructive',
      });
    }
  // The dependency array is empty to ensure this runs only once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display any errors to the user.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <p className="text-destructive font-semibold mb-4">Payment Error</p>
        <p className="text-muted-foreground">Could not initiate checkout. Please close this window and try again.</p>
      </div>
    );
  }

  // Renders a full-screen loading spinner while processing.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoadingSpinner />
      <p className="mt-4 text-muted-foreground">Redirecting to secure checkout...</p>
    </div>
  );
}

// Wraps the page in a Suspense boundary.
export default function SuspenseWrapper() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CheckoutPage />
    </Suspense>
  );
}