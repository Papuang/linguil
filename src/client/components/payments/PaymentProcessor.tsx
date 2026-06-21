'use client';

import { lazy, Suspense, useEffect, useState } from 'react';

// Dynamically import the PostPaymentHandler when the 'session_id' URL parameter is present.
const PostPaymentHandler = lazy(() =>
  import('@/client/components/payments/PostPaymentHandler').then(mod => ({ default: mod.PostPaymentHandler }))
);

export function PaymentProcessor() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setSessionId(searchParams.get('session_id'));
  }, []);

  if (sessionId) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <PostPaymentHandler />
      </Suspense>
    );
  }

  return null;
}