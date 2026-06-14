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
  // Defer the failure to whoever awaits the promise (their try/catch handles it),
  // and attach a no-op catch so a missing URI doesn't crash the lambda with an
  // unhandled promise rejection.
  clientPromise = Promise.reject(new Error("MONGODB_URI is not set"));
  clientPromise.catch(() => {});
} else if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect();
    global._mongoClientPromise.catch(() => {});
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
  clientPromise.catch(() => {});
}

export default clientPromise;

export const DB_NAME = process.env.MONGODB_DB || "jobboard";
