import type { Hono, Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { settings } from '@devvit/web/server';

// Stripe checkout session route handler for Devvit.
// Proxies authenticated requests from the client to the backend function.
export const addCreateCheckoutSessionRoute = (app: Hono) => {
  app.post('/api/create-checkout-session', async (c: Context) => {
    try {
      const CHECKOUT_FUNCTION_URL = await settings.get('NEXT_PUBLIC_FIREBASE_CHECKOUT_FUNCTION_URL');
      if (!CHECKOUT_FUNCTION_URL || typeof CHECKOUT_FUNCTION_URL !== 'string') {
        console.error('Checkout Error: CHECKOUT_FUNCTION_URL not configured');
        return c.json({ message: 'Server configuration error' }, 500);
      }

      const body = await c.req.json();
      
      // 1. Get the token from the httpOnly cookie.
      const idToken = getCookie(c, 'firebaseIdToken');
      if (!idToken) {
        return c.json({ error: "You must be logged in to do that." }, 401);
      }

      // 2. Call the backend function, passing the token in the Authorization header.
      const response = await fetch(CHECKOUT_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      // 3. Return the response from the Firebase function to the client.
      return c.json(data, response.status as any);

    } catch (error) {
      console.error("Error in create-checkout-session proxy:", error);
      return c.json({ error: "An unexpected error occurred." }, 500);
    }
  });
};