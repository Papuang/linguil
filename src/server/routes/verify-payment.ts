import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import type { Context as HonoContext } from 'hono';
import { restGetDoc } from '../lib/firestore-rest';

// Creates a route to check for the 'hasPaid' field in the user's Firestore document.
export const addVerifyPaymentRoute = (app: Hono) => {
  app.get('/verify-payment', async (c: HonoContext) => {
    try {
      // 1. Get the current user from the server-side Reddit client.
      const currentUser = await reddit.getCurrentUser();
      if (!currentUser) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      // 2. Access Firestore using the REST helper.
      const userDoc = await restGetDoc(`users/${currentUser.id}`);

      // 3. Check if the 'hasPaid' field is true.
      if (userDoc && userDoc.hasPaid) {
        // The user has paid. Inform the client.
        return c.json({ status: 'paid' }, 200);
      } else {
        // The user has not paid yet. Inform the client to continue polling.
        return c.json({ status: 'unpaid' }, 200);
      }

    } catch (error) {
      console.error('[Verify Payment]: An unexpected error occurred:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });
};