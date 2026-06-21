import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { restUpdateDoc } from '@/server/lib/firestore-rest';
import type { PaymentHandlerResponse } from '@devvit/web/server';
import type { Order } from '@devvit/web/shared';

// Create a more specific type for the order payload to work around limitations in the official Devvit type definitions.
// The official `Order` type is missing `userId` and uses an un-exported `status` enum.
type RefundOrder = Omit<Order, 'status'> & {
  status: string;
  userId: string;
};

const LINGUIL_PLUS_SKU = "linguil_plus";

// Adds the route for refunding a paid order.
export const addRefundOrderRoute = (app: Hono) => {
  app.post('/internal/payments/refund', async (c: HonoContext) => {
    try {
      const order = await c.req.json<RefundOrder>();

      if (!order || !order.userId) {
        return c.json<PaymentHandlerResponse>({ success: false, reason: 'Invalid order data' });
      }

      // Only revoke entitlement if the refund is for the correct product SKU.
      if (order.products.some((p) => p.sku === LINGUIL_PLUS_SKU)) {
        // The userId from the order webhook should be the same as the user's document ID.
        await restUpdateDoc(`users/${order.userId}`, { hasPaid: false });
      }

      return c.json<PaymentHandlerResponse>({ success: true });
    } catch (error) {
      console.error('[Refund Order]: An unexpected error occurred:', error);
      return c.json<PaymentHandlerResponse>({ success: false, reason: 'Internal server error' });
    }
  });
};