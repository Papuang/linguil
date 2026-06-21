import "server-only";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { type UserRecord } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import { db } from "./init";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define secrets required for the function.
const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");
const googleAuthFunctionUrl = defineSecret("NEXT_PUBLIC_FIREBASE_GOOGLE_AUTH_FUNCTION_URL");
const firebaseProjectId = defineSecret("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const firebaseApiKey = defineSecret("NEXT_PUBLIC_FIREBASE_API_KEY");
const firestoreWriteSecret = defineSecret("FIRESTORE_WRITE_SECRET");

// Helper to format JS types to Firestore's expected value format.
const toFirestoreValue = (value: any): Record<string, any> => {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object" && value !== null) {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])) } };
  }
  return {};
};

interface GoogleTokenData {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
}

export const googleAuth = onRequest(
  { secrets: [googleClientId, googleClientSecret, googleAuthFunctionUrl, firebaseProjectId, firebaseApiKey, firestoreWriteSecret], cors: true, region: "us-central1" },
  async (req, res) => {
    const { code, state, sessionId } = req.query;

    // Stage 1: Start auth flow, redirecting to Google.
    if (sessionId && typeof sessionId === "string") {
      logger.info(`[Google Stage 1] Initiating auth for session: ${sessionId}`);
      try {
        const newState = db.collection("_auth_state").doc().id;
        await db.collection("_auth_state").doc(newState).set({ sessionId, createdAt: new Date() });

        const params = new URLSearchParams({
          client_id: googleClientId.value(),
          redirect_uri: googleAuthFunctionUrl.value(),
          response_type: "code",
          scope: "openid email profile",
          state: newState,
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        logger.info(`[Google Stage 1] Redirecting to ${authUrl}`);
        res.redirect(authUrl);
      } catch (error) {
        logger.error("[Google Stage 1] Error during auth initiation", { sessionId, error });
        res.status(500).send("<html><body>Auth initiation failed.</body></html>");
      }
      return;
    }

    // Stage 2: Handle callback from Google.
    if (code && typeof code === "string" && state && typeof state === "string") {
      logger.info(`[Google Stage 2] Handling callback for state: ${state}`);
      try {
        const stateDocRef = db.collection("_auth_state").doc(state);
        const stateDoc = await stateDocRef.get();
        if (!stateDoc.exists) throw new Error("Invalid or expired state token");
        const storedSessionId = stateDoc.data()?.sessionId;
        await stateDocRef.delete();
        if (!storedSessionId) throw new Error("Session ID not found in state document");

        logger.info(`[Google Stage 2] Exchanging code for token. Session: ${storedSessionId}`);
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, client_id: googleClientId.value(), client_secret: googleClientSecret.value(), redirect_uri: googleAuthFunctionUrl.value(), grant_type: "authorization_code" }),
        });

        const tokenData = (await tokenResponse.json()) as Partial<GoogleTokenData> & { error_description?: string };
        if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error_description || "Token exchange failed");

        logger.info("[Google Stage 2] Fetching user profile from Google");
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;
        const { email, name: displayName, picture: photoURL } = userInfo;

        logger.info(`[Google Stage 2] Creating/updating Firebase user: ${email}`);
        let userRecord: UserRecord;
        try {
          userRecord = await admin.auth().getUserByEmail(email);
          await admin.auth().updateUser(userRecord.uid, { displayName, photoURL });
        } catch (error: any) {
          if (error.code === "auth/user-not-found") {
            userRecord = await admin.auth().createUser({ email, displayName, photoURL, emailVerified: true });
          } else { throw error; }
        }

        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        logger.info(`[Google Stage 2] Fulfilling auth session: ${storedSessionId}`);
        const docPath = `_auth_sessions/${storedSessionId}`;
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId.value()}/databases/(default)/documents/${docPath}?key=${firebaseApiKey.value()}`;
        const body = {
          fields: {
            status: { stringValue: "completed" },
            idToken: { stringValue: customToken },
            user: toFirestoreValue({ uid: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName, photoURL: userRecord.photoURL }),
            writeSecret: { stringValue: firestoreWriteSecret.value() },
          },
        };
        await fetch(firestoreUrl, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

        logger.info(`[Google Stage 2] Successfully completed auth for session: ${storedSessionId}`);
        res.status(200).send("<html><body><h1>Success!</h1><p>You can now close this window.</p></body></html>");
      } catch (error) {
        logger.error("[Google Stage 2] Error during auth callback", { state, code, error });
        res.status(500).send("<html><body>Auth failed. Please try again.</body></html>");
      }
      return;
    }

    logger.warn("Invalid request parameters received", { query: req.query });
    res.status(400).send("Invalid request parameters.");
  }
);