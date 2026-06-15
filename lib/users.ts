import type { Collection, Db } from "mongodb";
import clientPromise from "./mongodb";
import type { Job } from "./types";
import type { SearchConfig } from "./searchConfig";

// User document shape. The NextAuth adapter manages name/email/image; we add
// phone, the encrypted Apify key, and the per-user saved job statuses.
export interface UserDoc {
  email: string;
  name?: string | null;
  image?: string | null;
  phone?: string | null;
  apifyKeyEnc?: string | null; // AES-256-GCM, never sent to the client
  apifyKeyHint?: string | null; // masked hint (e.g. ••••ab12) safe to show
  // Saved Applied / Not-interested jobs. Stored as an array (Mongo field names
  // can't contain the dots/slashes in URLs). We keep the job snapshot too so the
  // filed tabs render on any device.
  jobStatus?: { url: string; status: "applied" | "notinterested"; job: Job }[];
  // What this user fetches from Apify on refresh (location / freshness / roles).
  searchConfig?: SearchConfig;
}

async function getDb(): Promise<Db> {
  // Use the default database from MONGODB_URI — same db the NextAuth adapter uses.
  return (await clientPromise).db();
}

export async function users(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}

export async function getUserByEmail(email: string): Promise<UserDoc | null> {
  return (await users()).findOne({ email });
}
