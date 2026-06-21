import type { Hono, Context } from 'hono';
import { restGetDoc, restCommit } from '@/server/lib/firestore-rest';

// Route handler for adding a friend in Devvit.
export const addAddFriendRoute = (app: Hono) => {
  app.post('/api/user/add-friend', async (c: Context) => {
    try {
      const uid = c.get('uid'); // UID is set by the verifyToken middleware.
      if (!uid) return c.json({ message: "Unauthorized" }, 401);

      const { friendUid } = await c.req.json();
      if (!friendUid || typeof friendUid !== 'string') {
        return c.json({ message: 'Invalid friend UID' }, 400);
      }
      if (uid === friendUid) {
        return c.json({ message: 'Cannot add yourself as a friend' }, 400);
      }

      // 1. Verify user is not already a friend.
      const userDoc = await restGetDoc(`users/${uid}`);
      if (userDoc?.friends?.includes(friendUid)) {
        return c.json({ message: 'You are already friends' }, 400);
      }

      // 2. Verify the friend exists in the public user directory.
      const friendDoc = await restGetDoc(`users_public/${friendUid}`);
      if (!friendDoc) {
        return c.json({ message: 'User not found' }, 404);
      }
      const friendName = friendDoc.displayName || 'Anonymous';

      // 3. Add friend using a commit with a field transform (atomic arrayUnion).
      await restCommit([
        {
          transform: {
            document: `users/${uid}`,
            fieldTransforms: [
              {
                fieldPath: 'friends',
                appendMissingElements: { values: [{ stringValue: friendUid }] },
              },
            ],
          },
        },
      ]);

      return c.json({ message: 'Friend added successfully', friendName });
    } catch (error: any) {
      console.error('Add friend error:', error);
      return c.json({ message: 'Internal Server Error' }, 500);
    }
  });
};