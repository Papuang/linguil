import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { authenticateRequest } from '@/lib/api/auth-utils';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { uid } = authResult;

    // Get the user's private document to find their friends list
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        return new NextResponse(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    const friendUids = userDoc.data()?.friends || [];
    const allUids = Array.from(new Set([uid, ...friendUids]));

    if (allUids.length === 0) {
        return NextResponse.json([]);
    }

    // Fetch the public data for the user and their friends
    const usersPublicRef = db.collection('users_public');
    const playerDocs = await usersPublicRef.where(admin.firestore.FieldPath.documentId(), 'in', allUids).get();

    const playersData = playerDocs.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

    return NextResponse.json(playersData);

  } catch (error) {
    console.error('Fetch friends data error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return new NextResponse(JSON.stringify({ message: errorMessage }), { status: 500 });
  }
}