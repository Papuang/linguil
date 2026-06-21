import type { Hono, Context } from 'hono';
import { restGetDoc } from '@/server/lib/firestore-rest';

// Source of truth for the client's user state.
export const addMeRoute = (app: Hono) => {
  app.get('/api/user/me', async (c: Context) => {
    const userProfile = c.get('userProfile');
    if (!userProfile) {
      return c.json({ user: null, hasPaid: false }, 401);
    }

    const user = {
      uid: userProfile.localId,
      displayName: userProfile.displayName || null,
      photoURL: userProfile.photoURL || null,
      email: userProfile.email || null,
    };

    try {
      const userDoc = await restGetDoc(`users/${user.uid}`);
      const hasPaid = userDoc?.hasPaid === true;

      return c.json({ user, hasPaid });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return c.json({ message: 'Internal Server Error' }, 500);
    }
  });
};