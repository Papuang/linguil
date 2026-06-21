import { Hono } from 'hono';
import { restQuery } from '../lib/firestore-rest';

export const addLeaderboardRoute = (app: Hono) => {
  app.get('/api/leaderboard', async (c) => {
    try {
      const usersSnapshot = await restQuery('users_public', {});

      if (!usersSnapshot || usersSnapshot.length === 0) {
        return c.json([]);
      }
      
      const leaderboardData = usersSnapshot.map((data: any) => {
        // Provide default values for scores if they don't exist.
        const scores = data.scores || { totalCorrect: 0, totalAnswered: 0, perfectScores: 0 };
        return {
          uid: data._id,
          displayName: data.displayName || 'Anonymous',
          scores: {
            totalCorrect: scores.totalCorrect || 0,
            totalAnswered: scores.totalAnswered || 0,
            perfectScores: scores.perfectScores || 0,
          },
        };
      });

      // Sort by total correct answers in descending order.
      leaderboardData.sort((a, b) => b.scores.totalCorrect - a.scores.totalCorrect);

      return c.json(leaderboardData);

    } catch (error) {
      console.error('Leaderboard data fetch error:', error);
      return c.json({ message: 'Failed to fetch leaderboard data.' }, 500);
    }
  });
};