import type { Hono, Context } from 'hono';
import { restGetDoc, restQuery } from '@/server/lib/firestore-rest';

// Route handler for fetching leaderboard data for the current user and their friends in Devvit.
export const addFriendsRoute = (app: Hono) => {
  app.get('/api/user/friends', async (c: Context) => {
    try {
      const uid = c.get('uid'); // UID is set by the verifyToken middleware.
      if (!uid) return c.json({ message: "Unauthorized" }, 401);

      // 1. Get the user's private document to find their list of friend UIDs.
      const userDoc = await restGetDoc(`users/${uid}`);
      if (!userDoc) {
        return c.json({ message: 'User not found' }, 404);
      }

      const friendUids = userDoc.friends || [];
      // Create a unique list of UIDs including the user themselves.
      const allUids = Array.from(new Set([uid, ...friendUids]));

      if (allUids.length === 0) {
        return c.json([]);
      }

      // 2. Fetch the public data for all UIDs in a single batch query.
      const constraints = {
        where: {
          fieldFilter: {
            field: { fieldPath: '__name__' },
            op: 'IN',
            value: { arrayValue: { values: allUids.map(id => ({ referenceValue: `users_public/${id}`})) } },
          },
        },
      };

      const playersData = await restQuery('users_public', constraints);

      return c.json(playersData);
    } catch (error: any) {
      console.error('Fetch friends data error:', error, error.response?.data);
      return c.json({ message: 'Internal Server Error' }, 500);
    }
  });
};