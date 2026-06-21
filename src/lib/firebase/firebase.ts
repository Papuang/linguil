import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

// Define the keys backed by environment variables.
type EnvBackedFirebaseKeys = keyof Omit<FirebaseOptions, 'databaseURL' | 'recaptchaSiteKey'>;

// Maps config keys to environment variables for clearer error messages.
const ENV_VAR_MAP: Record<EnvBackedFirebaseKeys, string> = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
  measurementId: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
};

// Loads and validates the client-side Firebase configuration from environment variables.
function getFirebaseConfig(): FirebaseOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: isProduction ? "auth.linguil.app" : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    recaptchaSiteKey: '',
  };

  // Ensure all required environment variables are present.
  for (const key in ENV_VAR_MAP) {
    const configKey = key as EnvBackedFirebaseKeys;
    if (!config[configKey]) {
      const envVarName = ENV_VAR_MAP[configKey];
      if (isProduction && configKey === 'authDomain') continue;
      throw new Error(`CRITICAL: Missing Firebase environment variable: ${envVarName}.`);
    }
  }

  return config as FirebaseOptions;
}

// Initializes and returns a singleton Firebase app instance.
const getFirebaseApp = (): FirebaseApp => {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(getFirebaseConfig());
};

// Lazily imports and returns the Firebase Auth service.
export const getFirebaseAuth = async () => {
  const { getAuth } = await import('firebase/auth');
  return getAuth(getFirebaseApp());
};

// Lazily imports and returns the Firebase Firestore service.
export const getFirebaseFirestore = async () => {
  const { getFirestore } = await import('firebase/firestore');
  return getFirestore(getFirebaseApp());
};

// Lazily imports and returns the Firebase Functions service.
export const getFirebaseFunctions = async () => {
  const { getFunctions } = await import('firebase/functions');
  return getFunctions(getFirebaseApp(), 'us-central1');
};

// Lazily imports and returns the Firebase Performance service.
export const getFirebasePerformance = async () => {
  const { getPerformance } = await import('firebase/performance');
  return getPerformance(getFirebaseApp());
};

// Lazily imports and returns the Firebase Analytics service if supported.
export const getFirebaseAnalytics = async () => {
  const { getAnalytics, isSupported } = await import('firebase/analytics');
  if (await isSupported()) {
    return getAnalytics(getFirebaseApp()); // Return Analytics only if the browser supports it.
  }
  return null;
};