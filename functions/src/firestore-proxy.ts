import {onRequest} from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import fetch, {HeadersInit} from "node-fetch";

const firestoreApiKeySecret = defineSecret("NEXT_PUBLIC_FIREBASE_API_KEY");

export const firestoreProxy = onRequest(
  {
    region: "us-central1",
    invoker: "public",
    secrets: [firestoreApiKeySecret],
  },
  async (req, res) => {
    // Set CORS headers for preflight and actual requests.
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, x-proxy-api-key");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    
    // Authenticate the request from the Devvit app.
    const expectedKeyValue = firestoreApiKeySecret.value();
    if (!expectedKeyValue) {
      logger.error("FATAL: The NEXT_PUBLIC_FIREBASE_API_KEY secret is not available.");
      res.status(500).send("Internal Server Error: Server configuration error.");
      return;
    }

    const requestKeyHeader = req.headers["x-proxy-api-key"];
    const requestKey = Array.isArray(requestKeyHeader) ? requestKeyHeader[0] : requestKeyHeader;

    if (requestKey !== expectedKeyValue) {
      logger.warn("Unauthorized API key from Devvit app.", {key: requestKey});
      res.status(401).send("Unauthorized");
      return;
    }

    // Validate the request body from the Devvit app.
    const {path, options} = req.body;
    if (!path || typeof path !== "string") {
      res.status(400).send("Bad Request: 'path' string is missing from body.");
      return;
    }

    try {
      const baseUrl = "https://firestore.googleapis.com/v1/projects/linguil/databases/(default)/documents";
      const finalUrl = `${baseUrl}/${path}${path.includes("?") ? "&" : "?"}key=${expectedKeyValue}`;
      
      const requestOptions = {
        method: options?.method || "GET",
        headers: (options?.headers || {}) as HeadersInit,
        body: options?.body, // This is expected to be a stringified JSON.
      };
      
      // Ensure Content-Type is set for requests with a body.
      if (requestOptions.body) {
        (requestOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
      }

      logger.info(`Proxying request to Firestore: ${requestOptions.method} ${finalUrl}`);
      
      // Forward the request to the actual Firestore REST API.
      const firestoreResponse = await fetch(finalUrl, requestOptions);

      // Proxy the response headers from Firestore back to the Devvit app.
      firestoreResponse.headers.forEach((value, name) => {
        res.setHeader(name, value);
      });
      
      const responseBody = await firestoreResponse.text();
      res.status(firestoreResponse.status).send(responseBody);

    } catch (error) {
      logger.error("Error processing firestore proxy request:", { error: error as any });
      res.status(500).send("Internal Server Error");
    }
  }
);