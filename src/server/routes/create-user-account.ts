import type { Hono, Context } from 'hono';
import { settings } from '@devvit/web/server';

// Proxies a request from the client to a backend Firebase function.
export const addUserAccountRoute = (app: Hono) => {
  app.post('/api/create-user-account', async (c: Context) => {
    try {
      const CREATE_USER_URL = await settings.get('NEXT_PUBLIC_FIREBASE_CREATE_USER_FUNCTION_URL');
      if (typeof CREATE_USER_URL !== 'string' || !CREATE_USER_URL) {
        console.error('ERROR: The `NEXT_PUBLIC_FIREBASE_CREATE_USER_FUNCTION_URL` environment variable is not set or not a string.');
        return c.json({ error: 'Server configuration error' }, 500);
      }

      const body = await c.req.json();

      // Forward the request to the Firebase function.
      const response = await fetch(CREATE_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Correctly handle non-JSON error responses from the function.
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Firebase function call failed with status ${response.status}:`, errorText);
        return c.json({ error: errorText || 'Function call failed' }, response.status as any);
      }

      // If the function returns a successful response, it will be in JSON format.
      const data = await response.json();
      return c.json(data, response.status as any);
      
    } catch (error: any) {
      console.error("Signup proxy route crashed:", error.message);
      return c.json({ error: `Proxy error: ${error.message}` }, 500);
    }
  });
};