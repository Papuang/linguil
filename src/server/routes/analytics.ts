import { Hono } from 'hono';
import { reddit, settings } from '@devvit/web/server';
import type { Context as HonoContext } from 'hono';

// Proxies analytics events to Google Analytics via a dedicated Cloud Function for Devvit.
export const addAnalyticsRoute = (app: Hono) => {
  app.post('/api/analytics', async (c: HonoContext) => {
    const measurementId = await settings.get('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID');
    const apiSecret = await settings.get('NEXT_PUBLIC_FIREBASE_API_KEY');
    const analyticsProxyUrl = await settings.get('NEXT_PUBLIC_FIREBASE_ANALYTICS_PROXY_URL');

    if (!measurementId || typeof measurementId !== 'string' || 
        !apiSecret || typeof apiSecret !== 'string' ||
        !analyticsProxyUrl || typeof analyticsProxyUrl !== 'string') {
      console.error('[Analytics Route]: Analytics environment variables are not fully configured.');
      // Return a 202 'Accepted' to prevent the client from seeing a server configuration error.
      return c.body(null, 202);
    }

    try {
      const currentUser = await reddit.getCurrentUser();
      if (!currentUser?.id) {
        // Silently ignore events from logged-out users.
        return c.body(null, 202);
      }
      const clientId = currentUser.id;

      const { eventName, eventData } = await c.req.json();

      // Construct the payload for the Google Analytics Measurement Protocol.
      const gaPayload = {
        client_id: clientId,
        events: [{
          name: eventName,
          params: eventData,
        }],
      };

      // Construct the payload for the proxy function.
      const proxyPayload = {
        measurementId,
        apiSecret,
        payload: gaPayload,
      };

      // Send the data to the proxy.
      await fetch(analyticsProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyPayload),
      });

      // Always return 'Accepted' as the request is now in the backend's hands.
      return c.body(null, 202);

    } catch (error) {
      console.error('[Analytics Route]: An unexpected error occurred:', error);
      // Still return 'Accepted' to avoid client-side impact.
      return c.body(null, 202);
    }
  });
};