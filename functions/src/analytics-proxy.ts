import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";

// A secure proxy for forwarding analytics events from a Devvit app to the Google Analytics Measurement Protocol API.
export const analyticsProxy = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  const { measurementId, apiSecret, payload } = req.body;

  // Basic validation to ensure the necessary components are present.
  if (!measurementId || !apiSecret || !payload) {
    logger.warn("Analytics proxy called with missing data.", { 
      hasMeasurementId: !!measurementId,
      hasApiSecret: !!apiSecret,
      hasPayload: !!payload 
    });
    res.status(400).json({ error: "Missing required analytics data." });
    return;
  }

  const targetUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  logger.info("Proxying analytics event to Google Analytics.");

  try {
    // Forward the analytics payload to the Google Analytics Measurement Protocol.
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // If the response from Google is not OK, log the details for debugging.
    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Google Analytics API returned an error.", { 
        status: response.status, 
        body: errorBody 
      });
      // Still return a 202 to the client to avoid indicating a failure, as the event logging is not critical to the user journey.
      res.status(202).send();
      return;
    }
    
    // Successfully proxied. Respond to the original client. A 202 'Accepted' status is appropriate as we are just forwarding the request.
    res.status(202).send();

  } catch (error) {
    logger.error("Analytics Proxy Error: An unexpected error occurred.", { error });
    // Even in case of an internal error, we can send a 202 to the client, as this failure is not something the client can act on.
    res.status(202).send();
  }
});