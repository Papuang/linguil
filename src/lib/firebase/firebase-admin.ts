import admin from 'firebase-admin';
import 'server-only';
let adminInitializationPromise: Promise<void> | undefined = undefined;

// Initializes the Firebase Admin SDK if not already running.
const initializeFirebaseAdmin = (): Promise<void> => {
    if (!adminInitializationPromise) {
        adminInitializationPromise = new Promise((resolve) => {
            if (admin.apps.length > 0) {
                resolve();
            } else {
                // Uses Application Default Credentials in the Google Cloud environment.
                admin.initializeApp();
                resolve();
            }
        });
    }
    return adminInitializationPromise;
};

// Gets the Firebase Admin Firestore service.
export const getAdminDb = async (): Promise<admin.firestore.Firestore> => {
    await initializeFirebaseAdmin();
    return admin.firestore();
};