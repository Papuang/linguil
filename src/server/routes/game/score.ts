import type { Hono, Context } from 'hono';
import { restGetDoc, restCreateDoc } from '@/server/lib/firestore-rest';

// Interface for the expected score data in the request body.
interface ScoreData {
  score: number;
  totalQuestions: number;
  wordIdentifier: string;
  questionResults: boolean[];
}

const getDocPath = (uid: string, wordIdentifier: string): string => {
  return `users/${uid}/dailyScores/${wordIdentifier}`;
};

export const addGameScoreRoute = (app: Hono) => {
  // POST: Saves a user's score for a specific word.
  app.post('/api/game/score', async (c: Context) => {
    try {
      // 1. Authenticate the user from the middleware context.
      const uid = c.get('uid');
      if (!uid) return c.json({ message: "Unauthorized" }, 401);

      // 2. Validate the request body against the required structure.
      const { score, totalQuestions, wordIdentifier, questionResults } = await c.req.json() as ScoreData;
      if (typeof score !== 'number' || typeof totalQuestions !== 'number' || !wordIdentifier || !Array.isArray(questionResults)) {
        return c.json({ message: 'Invalid score data payload' }, 400);
      }
      
      // 3. Define the document reference for a user's daily score.
      const docPath = getDocPath(uid, wordIdentifier);

      // 4. Check if a score has already been saved for this identifier.
      const existingDoc = await restGetDoc(docPath);
      if (existingDoc) {
        console.log(`Score for ${wordIdentifier} has already been saved for user ${uid}.`);
        return c.json({ message: 'Score already saved' }, 200);
      }

      // 5. If no score exists, prepare the new score record.
      const scoreRecord = {
        wordIdentifier,
        score,
        totalQuestions,
        questionResults,
        timestamp: new Date(), // NOTE: Using Devvit server time, not Firestore server time.
      };

      // 6. Save the new score record.
      await restCreateDoc(`users/${uid}/dailyScores`, wordIdentifier, scoreRecord);

      return c.json({ message: 'Score saved successfully' }, 201);
    } catch (error) {
      console.error(`[API/GAME/SCORE] Save error:`, error);
      return c.json({ message: 'Error saving score' }, 500);
    }
  });

  // GET: Fetches a user's score for a specific word.
  app.get('/api/game/score', async (c: Context) => {
    try {
      const uid = c.get('uid');
      if (!uid) return c.json({ message: "Unauthorized" }, 401);

      const wordIdentifier = c.req.query('wordIdentifier');
      if (!wordIdentifier) {
        return c.json({ message: 'Missing wordIdentifier' }, 400);
      }

      const docPath = getDocPath(uid, wordIdentifier);
      const docSnap = await restGetDoc(docPath);

      if (docSnap) {
        // Return the questionResults for the Share button.
        return c.json({
          score: docSnap.score,
          totalQuestions: docSnap.totalQuestions,
          questionResults: docSnap.questionResults
        });
      } else {
        // If the document doesn't exist, return null.
        return c.json(null, 200);
      }
    } catch (error) {
      console.error(`[API/GAME/SCORE] Fetch error:`, error);
      return c.json({ message: 'Error fetching score' }, 500);
    }
  });
};