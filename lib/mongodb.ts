import { MongoClient } from "mongodb";

// Single shared MongoClient promise, reused across hot-reloads (dev) and warm
// serverless invocations (prod). Required by the NextAuth MongoDB adapter and
// by our profile/status API routes.

const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  // Don't crash at import time during build; throw lazily when actually used.
  clientPromise = Promise.reject(new Error("MONGODB_URI is not set"));
} else if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export default clientPromise;

export const DB_NAME = process.env.MONGODB_DB || "jobboard";
