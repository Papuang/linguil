import type { Hono, Context } from 'hono';
import { deleteCookie } from 'hono/cookie';

// Handles clearing the auth cookie for logout.
export const addLogoutRoute = (app: Hono) => {
  app.post('/api/auth/logout', async (c: Context) => {
    // Always clear the cookie.
    deleteCookie(c, 'firebaseIdToken', {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    });

    return c.json({ message: 'Successfully logged out' });
  });
};