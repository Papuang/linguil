import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { onRequest } from "firebase-functions/v2/https";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import cookieParser from "cookie-parser";
import { db } from "./init";
import { getStripe } from "./stripe";
import { FacebookAdsApi, UserData, ServerEvent, EventRequest } from "facebook-nodejs-business-sdk";

const cookieParserMiddleware = cookieParser();

// Helper function to send the Meta CAPI registration payload securely.
const sendMetaCapiRegistration = async (uid: string, email?: string, extraData?: { fbc?: string; fbp?: string; clientIp?: string; userAgent?: string }) => {
  if (!email) return;

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  
  console.log("Attempting to use Pixel ID:", pixelId);

  if (!pixelId || !accessToken) {
    console.warn("Meta CAPI tracking skipped: Pixel ID or Access Token is missing.");
    return;
  }

  try {
    FacebookAdsApi.init(accessToken);

    const userData = new UserData()
      .setEmails([email])
      .setExternalId(uid)
      .setClientIpAddress(extraData?.clientIp ?? "")
      .setClientUserAgent(extraData?.userAgent ?? "")
      .setFbc(extraData?.fbc ?? "")
      .setFbp(extraData?.fbp ?? "");

    const serverEvent = new ServerEvent()
      .setEventName("CompleteRegistration")
      .setEventTime(Math.floor(Date.now() / 1000))
      .setEventSourceUrl("https://linguil.app")
      .setUserData(userData)
      .setEventId(uid) // Use UID for deduplication
      .setActionSource("website");

    const eventsData = [serverEvent];
    const eventRequest = new EventRequest(accessToken, pixelId).setEvents(eventsData);
    
    await eventRequest.execute();
    console.log("Successfully sent CompleteRegistration event to Meta CAPI.");

  } catch (error) {
    console.error("Failed to post Meta CAPI track request:", error);
  }
};

// Internal function to set up a new user's documents and Stripe customer.
const setupNewUser = async (user: admin.auth.UserRecord) => {
  const userPublicDocRef = db.collection("users_public").doc(user.uid);
  const doc = await userPublicDocRef.get();

  // Only proceed if the user's public document does not already exist.
  if (!doc.exists) {
    // Get a new write batch
    const batch = db.batch();

    // Create a new Stripe customer.
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { firebaseUID: user.uid },
    });

    // Set the private user document.
    const userDocRef = db.collection("users").doc(user.uid);
    batch.set(userDocRef, {
      stripeCustomerId: customer.id,
      email: user.email,
      hasPaid: false,
    });

    // Set the public user document.
    batch.set(userPublicDocRef, {
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      friendCode: user.uid,
      scores: {
        perfectScores: 0,
        totalAnswered: 0,
        totalCorrect: 0,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Commit the batch
    await batch.commit();
  }
};

// Background trigger (v1) to set up a new user.
export const onUserCreate = functions
  .region("us-central1")
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .auth.user()
  .onCreate((user) => setupNewUser(user));

// HTTP-triggered Cloud Function to create a new user account.
export const createUserAccount = onRequest(
  {
    region: "us-central1",
    secrets: ["STRIPE_SECRET_KEY", "META_CAPI_ACCESS_TOKEN", "META_PIXEL_ID"],
    memory: "256MiB",
    cors: [
      "https://www.linguil.app",
      "https://linguil.web.app",
      "https://linguil.firebaseapp.com",
      /^https:\/\/.*\.cloudworkstations\.dev$/,
    ],
  },
  (req, res) => {
    cookieParserMiddleware(req, res, async () => {
      // Destructure required parameters from the request body.
      const { name, email, password, fbc: fbcBody } = req.body;

      // Validate that all required parameters are present.
      if (!name || !email || !password) {
        res.status(400).send("Missing required parameters: name, email, or password");
        return;
      }

      let userRecord: admin.auth.UserRecord | null = null;

      try {
        // Check if a user with the given email already exists.
        try {
          await admin.auth().getUserByEmail(email);
          res.status(409).send("A user with this email address already exists");
          return;
        } catch (error: any) {
          // If the error is anything other than 'user-not-found', re-throw it.
          if (error.code !== "auth/user-not-found") {
            throw error;
          }
        }

        // Create a new user in Firebase Authentication.
        userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: name,
        });

        const fbc = fbcBody || req.cookies?.["_fbc"];
        const fbp = req.cookies?.["_fbp"];
        const clientIp = req.ip;
        const userAgent = req.headers["user-agent"] as string;


        // Manually call setupNewUser to ensure the displayName is captured correctly.
        await setupNewUser(userRecord);

        // Trigger CAPI event with full request context.
        sendMetaCapiRegistration(userRecord.uid, userRecord.email, { fbc, fbp, clientIp, userAgent }).catch(console.error);

        // Generate a custom token for the client to use for a reliable sign-in.
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        // Return the token to the client.
        res.json({ token: customToken });

      } catch (err: unknown) {
        // Clean up user record if user creation or setup fails.
        if (userRecord) {
          try {
            await admin.auth().deleteUser(userRecord.uid);
          } catch (cleanupError) {
            console.error(`CRITICAL: Failed to clean up user ${userRecord.uid} after a failed signup.`, cleanupError);
          }
        }

        console.error("Error in createUserAccount:", err);
        res.status(500).send("An unexpected error occurred while creating the user account");
      }
    });
  }
);

// Callable function for tracking Google/Discord sign-ups.
export const trackSocialRegistration = onCall(
  {
    region: "us-central1",
    secrets: ["META_CAPI_ACCESS_TOKEN", "META_PIXEL_ID"],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in to track registration.");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;
    const { fbc, fbp } = request.data;
    
    // onCall functions provide IP and User Agent in the raw request context.
    const clientIp = request.rawRequest.ip;
    const userAgent = request.rawRequest.headers["user-agent"];

    await sendMetaCapiRegistration(uid, email, { fbc, fbp, clientIp, userAgent });

    return { success: true };
  }
);