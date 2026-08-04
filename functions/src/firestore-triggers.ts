import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { db } from "./init";
import { sendMetaCapiRegistration } from "./user-management";

// Firestore trigger that sends a Meta CAPI CRM Lead event when a new 'users' document is created.
export const onUserDocumentCreate = onDocumentCreated({ document: "users/{userId}", region: "us-central1", secrets: ["META_CAPI_ACCESS_TOKEN", "META_PIXEL_ID"] }, async (event) => {
  try {
    if (!event.data) return;

    const data = event.data.data();
    const userId = event.params.userId;

    // Check if the essential data is present.
    if (!data.email || !userId) {
      console.warn(`onUserDocumentCreate trigger for user ${userId} missing email.`);
      return;
    }

    await sendMetaCapiRegistration(userId, data.email, {
      leadId: data.metaLeadId, 
      fbc: data.fbc,
      fbp: data.fbp
    });

  } catch (err) {
    console.error(`Error in onUserDocumentCreate for user ${event.params.userId}:`, err);
  }
});

// Firestore trigger that updates a user's aggregated scores when a new daily score is created.
export const onDailyScoreCreate = onDocumentCreated({ document: "users/{userId}/dailyScores/{dailyScoreId}", region: "us-central1" }, async (event) => {
  try {
    // Get the user ID from the event parameters.
    const userId = event.params.userId;
    if (!userId) return;
    
    // Get a reference to the user's daily scores collection.
    const dailyScoresCollection = db.collection("users").doc(userId).collection("dailyScores");
    const snapshot = await dailyScoresCollection.get();

    // If there are no daily scores, reset the public scores.
    if (snapshot.empty) {
      await db.collection("users_public").doc(userId).update({
        "scores.perfectScores": 0,
        "scores.totalAnswered": 0,
        "scores.totalCorrect": 0,
      });
      return;
    }

    // Initialize score counters.
    let perfectScores = 0;
    let totalCorrect = 0;
    const totalAnswered = snapshot.size * 3; // 3 questions per day.

    // Iterate over each daily score to calculate the totals.
    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      if (data && typeof data.score === "number") {
        totalCorrect += data.score;
        if (data.score === 3) { // A score of 3 is perfect.
          perfectScores += 1;
        }
      }
    });

    // Update the user's public profile with the new aggregated scores.
    await db.collection("users_public").doc(userId).update({
      "scores.perfectScores": perfectScores,
      "scores.totalAnswered": totalAnswered,
      "scores.totalCorrect": totalCorrect,
    });

  } catch(err) {
    // Log any errors that occur.
    console.error(`Error in onDailyScoreCreate for user ${event.params.userId}:`, err);
  }
});

// Firestore trigger to synchronize the 'hasPaid' status with Firebase Auth custom claims.
export const onUserUpdate = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "us-central1",
    secrets: ["META_CAPI_ACCESS_TOKEN", "META_PIXEL_ID"],
  },
  async (event) => {
    try {
      // Exit if there's no event data.
      if (!event.data) return;

      // Get the data before and after the update.
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();
      const userId = event.params.userId;

      const leadAttached =
        !beforeData?.metaLeadId && Boolean(afterData?.metaLeadId);

      if (leadAttached && afterData?.email) {
        console.log("Firestore CRM CAPI dispatched", {
          uid: userId,
          hasLeadId: Boolean(afterData.metaLeadId),
          actionSource: "system_generated",
        });
        const response = await sendMetaCapiRegistration(userId, afterData.email, {
          leadId: afterData.metaLeadId,
          fbc: afterData.fbc,
          fbp: afterData.fbp,
        });
        console.log("Meta CAPI Response:", response);
      }

      // Exit if the 'hasPaid' status hasn't changed or there's no 'after' data.
      if (beforeData?.hasPaid === afterData?.hasPaid || !afterData) {
        return;
      }
      
      // Determine the new 'hasPaid' status.
      const hasPaid = afterData.hasPaid === true;

      // Update the custom claims on the user's auth token.
      const user = await admin.auth().getUser(userId);
      await admin.auth().setCustomUserClaims(userId, { ...user.customClaims, hasPaid: hasPaid });
    } catch (err) {
      console.error(`Error in onUserUpdate for user ${event.params.userId}:`, err);
    }
  }
);