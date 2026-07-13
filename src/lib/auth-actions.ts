'use client';

import type { UserCredential } from 'firebase/auth';

// Maps Firebase auth error codes to user-friendly messages.
export const getAuthErrorMessage = (error: unknown): string => {
  let message = 'An unexpected error occurred';

  // Cast the error to a more detailed type to inspect its properties.
  const errorObj = error as { code?: string; message?: string; details?: { code?: string } };

  // Check for a nested error code from a Cloud Function first.
  const code = errorObj.details?.code ?? errorObj.code;

  if (typeof code === 'string') {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'INVALID_LOGIN_CREDENTIALS': 
        message = 'Incorrect email or password';
        break;
      case 'functions/already-exists':
      case 'auth/email-already-in-use':
      case 'EMAIL_EXISTS': 
        message = 'Email already in use';
        break;
      case 'auth/weak-password':
      case 'auth/invalid-password':
      case 'WEAK_PASSWORD': 
        message = 'Password is too weak (min. 6 characters)';
        break;
      case 'auth/popup-blocked':
        message = 'Sign-in popup blocked—allow popups for linguil.app';
        break;
      case 'auth/popup-closed-by-user':
      case 'auth/user-cancelled':
        message = 'Sign-in process was cancelled';
        break;
      default:
        // For any other errors, show a generic message but log the code for debugging.
        console.error(`Unhandled auth error code: ${code}`);
        message = errorObj.message || code;
        break;
    }
  } else if (errorObj.message) {
    message = errorObj.message;
  }
  return message;
};

// Initiates the Google sign-in process.
export const signInWithGoogle = async (isInsideDiscord: boolean): Promise<UserCredential | void> => {
  const { getFirebaseAuth } = await import('@/lib/firebase/firebase');
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    if (isInsideDiscord) {
      // In the Discord client, popups are blocked, so we use redirect-based auth.
      return await signInWithRedirect(auth, provider);
    } else {
      // In a standard browser, we can use a popup.
      return await signInWithPopup(auth, provider);
    }
  } catch (error) {
    console.error("Detailed sign-in error:", error);
    throw error;
  }
};

// Authenticates a user with email and password.
export const handleSignInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  const { getFirebaseAuth } = await import('@/lib/firebase/firebase');
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  return await signInWithEmailAndPassword(auth, email, password);
};

// Creates a new user by calling the backend proxy, then signs them in.
export const handleSignUpWithEmail = async (name: string, email: string, password: string): Promise<UserCredential> => {
  // Pass fbc value from localStorage to the backend for CAPI.
  const fbc = localStorage.getItem('_fbc') || undefined;

  const response = await fetch('/api/create-user-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, fbc }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Sign-up failed');
  }

  const { getFirebaseAuth } = await import('@/lib/firebase/firebase');
  const { signInWithCustomToken } = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  return await signInWithCustomToken(auth, data.token);
};

// Sends a password reset email to the specified user.
export const handleResetPassword = async (email: string): Promise<void> => {
  const { getFirebaseAuth } = await import('@/lib/firebase/firebase');
  const { sendPasswordResetEmail } = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
};

// Signs out the currently authenticated user.
export const handleSignOut = async (): Promise<void> => {
  const { getFirebaseAuth } = await import('@/lib/firebase/firebase');
  const { signOut } = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  await signOut(auth);
};