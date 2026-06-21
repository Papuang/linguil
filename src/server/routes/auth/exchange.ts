import type { Hono, Context } from 'hono';
import { setCookie } from 'hono/cookie';
import { settings } from '@devvit/web/server';

// Exchanges a Firebase Custom Token for a session ID token via the secure backend proxy.
// On success, it establishes a user session by setting a secure, httpOnly cookie.
export const addExchangeTokenRoute = (app: Hono) => {
  app.post('/api/auth/exchange', async (c: Context) => {
    try {
      const { token } = await c.req.json();
      const apiKey = await settings.get('NEXT_PUBLIC_FIREBASE_API_KEY');
      const authProxyUrl = await settings.get('NEXT_PUBLIC_FIREBASE_EMAIL_AUTH_FUNCTION_URL');

      if (!apiKey || typeof apiKey !== 'string' || !authProxyUrl || typeof authProxyUrl !== 'string') {
        console.error("Exchange Token Error: Firebase environment variables are not configured.");
        return c.json({ message: "Server configuration error." }, 500);
      }

      // 1. Exchange the custom token for an ID token via the secure auth proxy.
      const exchangeResponse = await fetch(authProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
          body: { token, returnSecureToken: true },
        }),
      });

      const exchangeData = await exchangeResponse.json();
      if (!exchangeResponse.ok) {
        return c.json({ message: exchangeData.error?.message || "Token exchange failed.", code: exchangeData.error?.message }, exchangeResponse.status as any);
      }

      const idToken = exchangeData.idToken;
      const expiresIn = parseInt(exchangeData.expiresIn, 10);

      // 2. Set the ID token in a secure, httpOnly cookie to establish the session.
      setCookie(c, 'firebaseIdToken', idToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: expiresIn,
        path: '/',
      });

      // 3. Return a simple success status. The client calls /api/user/me to get the profile.
      return c.json({ status: 'success' });

    } catch (error: any) {
      console.error('Exchange token route crashed:', error.message);
      return c.json({ code: 'INTERNAL_ERROR', message: 'An unknown server error occurred.' }, 500);
    }
  });
};