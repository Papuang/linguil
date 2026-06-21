import type { Hono, Context } from 'hono';
import { restUpdateDoc } from '@/server/lib/firestore-rest';

// This function handles updating a user's display name.
export const addUpdateNameRoute = (app: Hono) => {
  app.post('/api/user/update-name', async (c: Context) => {
    try {
      const uid = c.get('uid');
      if (!uid) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const { newName } = await c.req.json();
      if (!newName || typeof newName !== 'string' || !newName.trim()) {
        return c.json({ message: 'Invalid name provided' }, 400);
      }

      await restUpdateDoc(`users_public/${uid}`, {
        displayName: newName,
      });

      return c.json({ message: 'Name updated successfully' }, 200);

    } catch (error: any) {
      console.error('Update name error:', error);
      return c.json({ message: 'Internal Server Error' }, 500);
    }
  });
};