import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { authenticateRequest } from '@/lib/api/auth-utils';

if (!admin.apps.length) {
  admin.initializeApp();
}

// This function handles updating a user's display name.
export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { uid } = authResult;

    const { newName } = await req.json();

    if (!newName || typeof newName !== 'string' || !newName.trim()) {
        return new NextResponse(JSON.stringify({ message: 'Invalid name provided' }), { status: 400 });
    }

    const db = admin.firestore();
    const userPublicRef = db.collection('users_public').doc(uid);

    await userPublicRef.update({ displayName: newName });

    return new NextResponse(JSON.stringify({ message: 'Name updated successfully' }), { status: 200 });

  } catch (error) {
    console.error('Update name error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return new NextResponse(JSON.stringify({ message: errorMessage }), { status: 500 });
  }
}