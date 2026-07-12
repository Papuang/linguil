import type { Hono, Context } from 'hono';

// Only allow proxying of Reddit profile picture URLs.
const allowedUrlPatterns = [
  /^https:\/\/reddit\.com\//,
  /^https:\/\/redditstatic\.com\//,
  /^https:\/\/redditmedia\.com\//,
];

const isUrlAllowed = (url: string): boolean => {
  return allowedUrlPatterns.some(pattern => pattern.test(url));
};

// Proxies Reddit profile images in Devvit.
export const addImageProxyRoute = (app: Hono) => {
  app.get('/api/user/image', async (c: Context) => {
    const imageUrl = c.req.query('url');

    // Ensure a URL is provided and it matches the allowed patterns.
    if (!imageUrl || !isUrlAllowed(imageUrl)) {
      return c.text('Invalid or disallowed URL', 400);
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');

      // Buffer the entire image. This is required for Devvit's non-streaming environment.
      const contentType = response.headers.get('content-type');
      const buffer = await response.arrayBuffer();

      const headers = new Headers();
      headers.set('Content-Type', contentType || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours.

      return new Response(buffer, {
        status: 200,
        headers: headers,
      });

    } catch (error) {
      console.error('Image proxy error:', error);
      return c.text('Error proxying image', 500);
    }
  });
};