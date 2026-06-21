import { useCallback } from 'react';

export const useAnalytics = () => {
  // Creates a memoized function to log analytics events for Devvit.
  const logEvent = useCallback(async (eventName: string, eventData: Record<string, any>) => {
    try {
      // Sends the event to the application's backend proxy.
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventName, eventData }),
      });

      // Warn if the backend returns a non-successful status, but not for 202 Accepted.
      if (!response.ok && response.status !== 202) {
        console.warn(`[Analytics Hook]: Backend proxy returned a non-success status: ${response.status}`);
      }

    } catch (error) {
      // Fail silently to avoid impacting user experience, but log the error for debugging.
      console.error('[Analytics Hook]: Failed to send event to backend proxy:', error);
    }
  }, []);

  return { logEvent };
};