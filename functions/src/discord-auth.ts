import * as admin from "firebase-admin";
import { type UserRecord } from "firebase-admin/auth";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import { db } from "./init";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const auth = admin.auth();

const discordClientSecret = defineSecret("DISCORD_CLIENT_SECRET");
const discordClientId = defineSecret("NEXT_PUBLIC_DISCORD_CLIENT_ID");
const discordAuthFunctionUrl = defineSecret("NEXT_PUBLIC_FIREBASE_DISCORD_AUTH_FUNCTION_URL");
const createUserFunctionUrl = defineSecret("NEXT_PUBLIC_FIREBASE_CREATE_USER_FUNCTION_URL");
const firebaseApiKey = defineSecret("NEXT_PUBLIC_FIREBASE_API_KEY");

interface DiscordTokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

export const discordAuth = onRequest(
  { region: "us-central1", secrets: [discordClientSecret, discordClientId, discordAuthFunctionUrl, createUserFunctionUrl, firebaseApiKey], memory: "256MiB", cors: true },
  async (req, res) => {
    const { code, state, sessionId } = req.query;

    if (sessionId && typeof sessionId === "string") {
      logger.info(`[Discord Stage 1] Initiating auth for session: ${sessionId}`);
      try {
        const newState = db.collection("_auth_state").doc().id;
        await db.collection("_auth_state").doc(newState).set({ sessionId, createdAt: new Date() });

        const params = new URLSearchParams({
          client_id: discordClientId.value(),
          redirect_uri: discordAuthFunctionUrl.value(),
          response_type: "code",
          scope: "identify guilds.join rpc.activities.write",
          state: newState,
        });

        const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
        logger.info(`[Discord Stage 1] Redirecting to ${authUrl}`);
        res.redirect(authUrl);
      } catch (error) {
        logger.error("[Discord Stage 1] Error during auth initiation", { sessionId, error });
        res.status(500).send("<html><body>Authentication initiation failed. Please try again.</body></html>");
      }
      return;
    }

    if (code && typeof code === "string" && state && typeof state === "string") {
      logger.info(`[Discord Stage 2] Handling callback for state: ${state}`);
      try {
        const stateDocRef = db.collection("_auth_state").doc(state);
        const stateDoc = await stateDocRef.get();

        if (!stateDoc.exists) throw new Error("Invalid or expired state token");
        const storedSessionId = stateDoc.data()?.sessionId;
        await stateDocRef.delete();
        if (!storedSessionId) throw new Error("Session ID not found in state document");

        logger.info(`[Discord Stage 2] Exchanging code for token. Session: ${storedSessionId}`);
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: discordClientId.value(),
            client_secret: discordClientSecret.value(),
            grant_type: "authorization_code",
            code: code.toString(),
            redirect_uri: discordAuthFunctionUrl.value(),
          }),
        });

        const tokenData = (await tokenResponse.json()) as Partial<DiscordTokenData> & { error?: string };
        if (!tokenResponse.ok || !tokenData.access_token) {
          throw new Error(`Discord token exchange failed: ${JSON.stringify(tokenData)}`);
        }

        logger.info("[Discord Stage 2] Fetching user profile from Discord");
        const userResponse = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const discordUser = (await userResponse.json()) as DiscordUser;
        const { id: discordId, username, avatar } = discordUser;
        const photoURL = avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png` : undefined;
        const email = `${username.replace(/[^a-zA-Z0-9]/g, "")}.${discordId}@linguil.app`;

        logger.info(`[Discord Stage 2] Creating/updating Firebase user: ${discordId}`);
        let userRecord: UserRecord;
        try {
          userRecord = await auth.getUser(discordId);
          await auth.updateUser(userRecord.uid, { email, displayName: username, photoURL });
        } catch (e: any) {
          if (e.code === "auth/user-not-found") {
            userRecord = await auth.createUser({ uid: discordId, email, displayName: username, photoURL });
            await auth.setCustomUserClaims(userRecord.uid, { hasPaid: false });
            fetch(createUserFunctionUrl.value(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uid: userRecord.uid, displayName: username, photoURL }),
            }).catch(err => logger.error("[Discord Stage 2] Error calling createUser function", { uid: userRecord.uid, error: err }));
          } else { throw e; }
        }

        const customToken = await auth.createCustomToken(userRecord.uid);

        logger.info(`[Discord Stage 2] Fulfilling auth session: ${storedSessionId}`);
        const docPath = `_auth_sessions/${storedSessionId}`;
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/linguil/databases/(default)/documents/${docPath}`;
        await fetch(`${firestoreUrl}?key=${firebaseApiKey.value()}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: { status: { stringValue: "completed" }, customToken: { stringValue: customToken } } }),
        });

        logger.info(`[Discord Stage 2] Successfully completed auth for session: ${storedSessionId}`);
        res.status(200).send("<html><body><h1>Success!</h1><p>You can now close this window.</p></body></html>");
      } catch (error) {
        logger.error("[Discord Stage 2] Error during auth callback", { state, code, error });
        res.status(500).send("<html><body>Authentication failed. Please close this window and try again.</body></html>");
      }
      return;
    }

    logger.warn("Invalid request parameters received", { query: req.query });
    res.status(400).send("Invalid request parameters. This function should be initiated from the main application.");
  }
);