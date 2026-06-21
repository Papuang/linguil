import type { Hono, Context } from 'hono';
import { settings } from '@devvit/web/server';

// Audio proxy route handler for Devvit.
// Fetches audio file from Google Cloud storage, buffers it in memory, and sends it to the client.
export const addAudioRoute = (app: Hono) => {
  app.get('/api/audio/*', async (c: Context) => {
    try {
      const url = new URL(c.req.url);
      // Extract the path part after `/api/audio/`.
      const filePath = url.pathname.substring('/api/audio/'.length);

      if (!filePath) {
        return c.text('File path is missing.', 400);
      }

      const bucketName = await settings.get('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
      if (!bucketName || typeof bucketName !== 'string') {
        console.error('Firebase Storage bucket name is not configured.');
        return c.text('Server configuration error', 500);
      }

      // Construct the public URL to the file in GCS.
      const publicUrl = `https://storage.googleapis.com/${bucketName}/audio/${filePath}`;

      // 1. Fetch the audio from the public GCS URL.
      const audioResponse = await fetch(publicUrl);

      if (!audioResponse.ok) {
        console.error(`Failed to fetch audio from GCS: ${audioResponse.status} ${audioResponse.statusText}`);
        return c.text(audioResponse.statusText, audioResponse.status as any);
      }

      // 2. Buffer the entire audio file into memory.
      const audioBuffer = await audioResponse.arrayBuffer();

      // 3. Create headers for the client response.
      const headers = new Headers();
      headers.set('Content-Type', audioResponse.headers.get('content-type') || 'audio/mpeg');
      headers.set('Content-Length', audioBuffer.byteLength.toString());
      headers.set('Cache-Control', 'public, max-age=86400, must-revalidate'); // Cache for 24 hours.

      // 4. Send the complete, buffered audio file to the client.
      return new Response(audioBuffer, {
        status: 200,
        headers: headers,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error(`[API/AUDIO] Proxy error: ${errorMessage}`);
      return c.text('Internal Server Error', 500);
    }
  });
};