import type { Hono, Context } from 'hono';
import { setCookie } from 'hono/cookie';
import { settings } from '@devvit/web/server';

// Email authentication route that sets a secure session cookie.
export const addEmailAuthRoute = (app: Hono) => {
  app.post('/api/auth/email', async (c: Context) => {
    try {
      const { email, password } = await c.req.json();
      const apiKey = await settings.get('NEXT_PUBLIC_FIREBASE_API_KEY');
      const authProxyUrl = await settings.get('NEXT_PUBLIC_FIREBASE_EMAIL_AUTH_FUNCTION_URL');

      if (!apiKey || typeof apiKey !== 'string' || !authProxyUrl || typeof authProxyUrl !== 'string') {
        console.error("Firebase environment variables are not configured.");
        return c.json({ message: "Server configuration error." }, 500);
      }

      // 1. Sign in the user with email and password via the auth proxy.
      const signInResponse = await fetch(authProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          body: { email, password, returnSecureToken: true },
        }),
      });

      const signInData = await signInResponse.json();
      if (!signInResponse.ok) {
          const googleError = signInData.error?.message || "UNKNOWN_GOOGLE_ERROR";
          return c.json({ message: googleError, code: googleError }, signInResponse.status as any);
      }

      const idToken = signInData.idToken;
      const expiresIn = parseInt(signInData.expiresIn, 10);

      // 2. Set the ID token in a secure, httpOnly cookie to establish a session.
      setCookie(c, 'firebaseIdToken', idToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: expiresIn,
        path: '/',
      });

      // 3. Return a success response. The client will then fetch the user profile.
      return c.json({ status: 'success' });

    } catch (error: any) {
      console.error('Email auth error:', error.message);
      return c.json({ code: 'INTERNAL_ERROR', message: 'An unknown server error occurred.' }, 500);
    }
  });
};