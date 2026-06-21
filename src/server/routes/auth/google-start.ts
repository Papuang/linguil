import type { Hono, Context } from 'hono';
import { settings } from '@devvit/web/server';

// This route is the entry point for the Google Auth popup.
// It proxies the request to the external Google Auth cloud function.
export const addGoogleAuthProxyRoute = (app: Hono) => {
  app.get('/api/auth/google/start', async (c: Context) => {
    try {
      const { sessionId } = c.req.query();

      if (!sessionId) {
        return c.json({ message: 'Invalid request: sessionId is required.' }, 400);
      }

      const googleAuthFunctionUrl = await settings.get('NEXT_PUBLIC_FIREBASE_GOOGLE_AUTH_FUNCTION_URL');
      if (typeof googleAuthFunctionUrl !== 'string' || !googleAuthFunctionUrl) {
        return c.json({ message: 'Server configuration error'}, 500)
      }

      // Construct the full URL to the cloud function, forwarding the sessionId.
      const destinationUrl = `${googleAuthFunctionUrl}?sessionId=${sessionId}`;

      // Return the Cloud Function URL as JSON to be used by the frontend.
      return c.json({ authUrl: destinationUrl });

    } catch (error: any) {
      console.error('Google auth proxy route error:', error.message);
      return c.json({ message: `Proxy error: ${error.message}` }, 500);
    }
  });
};