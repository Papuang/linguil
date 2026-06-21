import type { Hono, Context } from 'hono';
import { getDailyWordData } from '@/server/lib/game/data-service-server';

// Fetches the daily word data and provides it to the client.
export const addDailyWordRoute = (app: Hono) => {
  app.get('/api/daily-word', async (c: Context) => {
    try {
      // Retrieve the daily word data using the server-side data service.
      const dailyWordData = await getDailyWordData();
      // If no data is found for the current day, return a 404 Not Found response.
      if (!dailyWordData) {
        return c.json({ error: 'No daily word found' }, { status: 404 });
      }
      // If the data is successfully fetched, return it as a JSON response.
      return c.json(dailyWordData);
    } catch (e) {
      console.error("Failed to get daily word:", e);
      return c.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  });
};