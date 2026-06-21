'use client';

import { useReducer, useCallback } from 'react';
import { useToast } from '@/client/hooks/use-toast';
import { useAuth } from '@/client/hooks/use-auth';
import { navigateTo } from '@devvit/web/client';


// State structure for payment processing.
interface PaymentsState {
  isProcessing: boolean;
  error: string | null;
}

// Actions available for the payments reducer.
type PaymentsAction =
  | { type: 'PROCESS_START' }
  | { type: 'PROCESS_SUCCESS' }
  | { type: 'PROCESS_ERROR'; payload: string };

// Initial state for the payment process.
const initialState: PaymentsState = {
  isProcessing: false,
  error: null,
};

// Manages the state of payment operations.
const paymentsReducer = (state: PaymentsState, action: PaymentsAction): PaymentsState => {
  switch (action.type) {
    case 'PROCESS_START':
      return { isProcessing: true, error: null };
    case 'PROCESS_SUCCESS':
      return { isProcessing: false, error: null };
    case 'PROCESS_ERROR':
      return { isProcessing: false, error: action.payload };
    default:
      return state;
  }
};

// Custom hook for handling Stripe payment checkout sessions.
export const usePayments = () => {
  const { user } = useAuth(); // Get the current user from auth context.
  const [state, dispatch] = useReducer(paymentsReducer, initialState);
  const { toast } = useToast();

  // Displays an error notification.
  const showErrorToast = useCallback((title: string, description: string) => {
    toast({ title, description, variant: 'destructive' });
  }, [toast]);

  // Creates a Stripe checkout session and redirects the user to checkout.
  const createCheckoutSession = useCallback(async (priceId: string, successUrl?: string) => {
    dispatch({ type: 'PROCESS_START' });

    if (!user) {
      showErrorToast("Authentication error", "You must be signed in to make a purchase");
      dispatch({ type: 'PROCESS_ERROR', payload: 'User not authenticated' });
      return;
    }

    try {
      if (!priceId) {
        showErrorToast("Payment error", "No product selected");
        dispatch({ type: 'PROCESS_ERROR', payload: 'Price ID not specified' });
        return;
      }

      const baseUrl = successUrl || window.location.href;
      const finalUrl = new URL(baseUrl);
      finalUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
      
      const cancelUrl = window.location.origin;

      // Call the server API. Authentication is handled by the browser sending the session cookie automatically.
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId,
          successUrl: finalUrl.toString(),
          cancelUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }
      
      const url = data.url;
      if (!url) {
        throw new Error("Failed to retrieve checkout session URL");
      }

      // Redirect the user to the Stripe checkout page using the Devvit client API.
      navigateTo(url);

    } catch (err: any) {
      const errorMessage = "Failed to create checkout session";
      dispatch({ type: 'PROCESS_ERROR', payload: errorMessage });
      showErrorToast("Payment error", err.message || errorMessage);
    }
  }, [showErrorToast, user]);

  return { ...state, createCheckoutSession };
};