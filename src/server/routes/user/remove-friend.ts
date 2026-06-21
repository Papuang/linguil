import type { Hono, Context } from 'hono';
import { restCommit } from '@/server/lib/firestore-rest';

// Route handler for removing a friend from the user's friend list in Devvit.
export const addRemoveFriendRoute = (app: Hono) => {
  app.post('/api/user/remove-friend', async (c: Context) => {
    try {
      const uid = c.get('uid'); // UID is set by the verifyToken middleware.
      if (!uid) return c.json({ message: "Unauthorized" }, 401);

      const { friendUid } = await c.req.json();
      if (!friendUid || typeof friendUid !== 'string') {
        return c.json({ message: 'Invalid friend UID' }, 400);
      }

      await restCommit([
        {
          transform: {
            document: `users/${uid}`,
            fieldTransforms: [
              {
                fieldPath: 'friends',
                removeAllFromArray: {
                  values: [{ stringValue: friendUid }],
                },
              },
            ],
          },
        },
      ]);

      return c.json({ message: 'Friend removed successfully' });
    } catch (error: any) {
      console.error('Remove friend error:', error);
      return c.json({ message: 'Internal Server Error' }, 500);
    }
  });
};