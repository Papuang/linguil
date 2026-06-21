import type { Hono, Context } from 'hono';
import { settings } from '@devvit/web/server';

// Handles sending a password reset email by proxying the request to the Firebase Auth REST API.
export const addPasswordResetRoute = (app: Hono) => {
  app.post('/api/auth/password-reset', async (c: Context) => {
    try {
      const { email } = await c.req.json();
      if (!email) {
        return c.json({ message: 'Email is required' }, 400);
      }

      const apiKey = await settings.get('NEXT_PUBLIC_FIREBASE_API_KEY');
      const authProxyUrl = await settings.get('NEXT_PUBLIC_FIREBASE_EMAIL_AUTH_FUNCTION_URL');

      if (!apiKey || typeof apiKey !== 'string' || !authProxyUrl || typeof authProxyUrl !== 'string') {
        console.error("Password Reset Error: Firebase environment variables are not configured.");
        // For security, always return a success message to avoid leaking user existence information.
        return c.json({ message: 'Password reset email sent' });
      }

      await fetch(authProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
          body: {
            requestType: "PASSWORD_RESET",
            email: email
          }
        })
      });

      return c.json({ message: 'Password reset email sent' });

    } catch (error: any) {
      console.error('Password reset error:', error.message);
      return c.json({ message: 'Password reset email sent' });
    }
  });
};