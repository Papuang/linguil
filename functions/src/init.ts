import "server-only";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK.
admin.initializeApp();

// Export initialized services for use in other modules.
export const db = admin.firestore();