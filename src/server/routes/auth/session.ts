import type { Hono, Context } from 'hono';
import { 
  restGetDoc, 
  restSetDoc, 
  restUpdateDoc, 
  getSessionDocPath 
} from '../../lib/firestore-rest';

// Handles the creation and fulfillment of external auth sessions in Devvit.
// Uses Firestore documents as a temporary communication channel between the main client and the popup window.

export const addSessionAuthRoute = (app: Hono) => {

  // GET: Polls the status of a session. The client calls this repeatedly.
  app.get('/api/auth/session', async (c: Context) => {
    const sessionId = c.req.query('sessionId');
    if (!sessionId) {
      return c.json({ error: 'Missing sessionId' }, 400);
    }

    try {
      const docPath = getSessionDocPath(sessionId);
      const data = await restGetDoc(docPath);

      if (!data) {
        // A null result is expected until the session is created, so we return a custom status.
        return c.json({ status: 'not_found' });
      }

      return c.json(data);
    } catch (error) {
      console.error('Error polling session:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // POST: Creates or fulfills a session.
  app.post('/api/auth/session', async (c: Context) => {
    const { action, sessionId, idToken, user } = await c.req.json();

    if (!sessionId) {
      return c.json({ error: 'Missing sessionId' }, 400);
    }

    try {
      const docPath = getSessionDocPath(sessionId);

      if (action === 'create') {
        await restSetDoc(docPath, {
          status: 'pending',
          createdAt: new Date()
        });
        return c.json({ success: true });
      }

      if (action === 'fulfill') {
        await restUpdateDoc(docPath, {
          status: 'completed',
          idToken: idToken,
          user: user
        });
        return c.json({ success: true });
      }

      return c.json({ error: 'Invalid action' }, 400);
    } catch (error) {
      console.error('Error handling session action:', error);
      return c.json({ error: 'Server configuration or database error' }, 500);
    }
  });
};