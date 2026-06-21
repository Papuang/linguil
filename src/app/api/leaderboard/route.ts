import 'server-only';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized.
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export async function GET() {
  try {
    const usersSnapshot = await db.collection('users_public').get();
    const leaderboardData = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      // Provide default values for scores if they don't exist
      const scores = data.scores || { totalCorrect: 0, totalAnswered: 0, perfectScores: 0 };
      return {
        uid: doc.id,
        displayName: data.displayName || 'Anonymous',
        scores: {
            totalCorrect: scores.totalCorrect || 0,
            totalAnswered: scores.totalAnswered || 0,
            perfectScores: scores.perfectScores || 0,
        },
      };
    });

    // Sort by total correct answers in descending order
    leaderboardData.sort((a, b) => b.scores.totalCorrect - a.scores.totalCorrect);

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Leaderboard data fetch error:', error);
    return new NextResponse(JSON.stringify({ message: 'Failed to fetch leaderboard data.' }), { status: 500 });
  }
}