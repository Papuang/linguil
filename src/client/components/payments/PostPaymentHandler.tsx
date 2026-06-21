'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/client/hooks/use-toast';
import { useAuth } from '@/client/hooks/use-auth';
import { useAnalytics } from '@/client/hooks/use-analytics';

// Timeout for payment processing to prevent indefinite waiting.
const PROCESSING_TIMEOUT_MS = 30000;
// Interval for polling the backend to check for payment status.
const POLLING_INTERVAL_MS = 2000;

// Handles post-payment verification and logging by polling a backend endpoint.
export const PostPaymentHandler = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { logEvent } = useAnalytics();
  
  // Refs to manage the state of the verification process.
  const traceStatus = useRef<string | null>(null);
  const verificationStarted = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    const sessionId = searchParams.get('session_id');
    const value = searchParams.get('value');
    const currency = searchParams.get('currency');

    // Exit if there's no session, no user, or if verification has already started.
    if (!sessionId || !user?.uid || verificationStarted.current) {
      return;
    }
    verificationStarted.current = true;

    // 1. Replicate the start of the performance trace.
    traceStatus.current = 'started';
    logEvent('payment_verification_trace', { status: traceStatus.current, sessionId });

    let pollingIntervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };

    // 2. Set a timeout that replicates the original behavior.
    timeoutId = setTimeout(() => {
      cleanup();
      // Replicate the 'timeout' trace status.
      traceStatus.current = 'timeout';
      logEvent('payment_verification_trace', { status: traceStatus.current, sessionId });
      // Use the original toast message.
      toast({
        title: "Processing payment...",
        description: "linguil+ pending",
      });
    }, PROCESSING_TIMEOUT_MS);

    // 3. Start polling the backend API.
    pollingIntervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/verify-payment`);
        const data = await response.json();

        if (data.status === 'paid') {
          cleanup();

          // 4. Replicate the 'success' trace and the 'purchase' event.
          traceStatus.current = 'success';
          logEvent('payment_verification_trace', { status: traceStatus.current, sessionId });
          
          // Replicate the original purchase event.
          logEvent('purchase', {
            transaction_id: sessionId,
            value: value ? parseFloat(value) : 1.99,
            currency: currency || 'USD',
            items: [{
              item_id: 'linguil_plus_lifetime',
              item_name: 'linguil+ Lifetime',
              price: value ? parseFloat(value) : 1.99,
              quantity: 1
            }]
          });

          // Use the original success toast.
          toast({
            title: 'Successful payment!',
            description: 'linguil+ unlocked',
          });

          // Reload the app, causing the AuthProvider to refetch the user state.
          window.location.reload();
          window.history.replaceState({}, '', pathname);
        }
      } catch (error) {
        // 5. A single failed poll should not stop the process. Log it to the console and allow polling to continue.
        console.error('Payment verification poll failed:', error);
      }
    }, POLLING_INTERVAL_MS);

    // 6. Replicate the 'unmounted' trace status on cleanup.
    return () => {
      cleanup();
      if (traceStatus.current === 'started') {
        traceStatus.current = 'unmounted';
        logEvent('payment_verification_trace', { status: traceStatus.current, sessionId });
      }
    };
  }, [user, toast, logEvent]);

  return null;
};

PostPaymentHandler.displayName = 'PostPaymentHandler';