import type { Collection } from "mongodb";
import clientPromise from "./mongodb";
import { getUserByEmail, users } from "./users";
import type { Job } from "./types";

export type FiledStatus = "applied" | "saved" | "notinterested";

// One document per (user, job). Replaces the embedded jobStatus[] array on the
// user doc so a user's filed jobs can grow without bloating their user document.
export interface UserJobDoc {
  email: string; // foreign key to the user
  url: string; // stable job URL
  status: FiledStatus;
  job: Job;
  at?: number; // epoch ms when filed (recent sort)
  notifReadAt?: number; // epoch ms saved-job reminder last read
}

let indexesReady = false;

export async function userJobs(): Promise<Collection<UserJobDoc>> {
  const col = (await clientPromise).db().collection<UserJobDoc>("userJobs");
  if (!indexesReady) {
    try {
      await col.createIndex({ email: 1, url: 1 }, { unique: true });
      await col.createIndex({ email: 1, status: 1 });
      indexesReady = true;
    } catch {
      /* index creation is best-effort */
    }
  }
  return col;
}

/**
 * One-time, idempotent migration: copy a user's embedded `jobStatus[]` into the
 * `userJobs` collection, then drop the embedded field. Safe to re-run and
 * crash-safe — rows are inserted only if absent (never overwriting newer data),
 * and the old field is removed only after the copy.
 */
export async function migrateUserIfNeeded(email: string): Promise<number> {
  const user = await getUserByEmail(email);
  const legacy = user?.jobStatus;
  if (!Array.isArray(legacy)) return 0; // already migrated, or never had any

  const col = await userJobs();
  let migrated = 0;
  for (const e of legacy) {
    if (!e?.url) continue;
    const setOnInsert: Partial<UserJobDoc> = {
      status: e.status,
      job: e.job,
      at: e.at ?? 0,
    };
    if (e.notifReadAt) setOnInsert.notifReadAt = e.notifReadAt;
    await col.updateOne({ email, url: e.url }, { $setOnInsert: setOnInsert }, { upsert: true });
    migrated++;
  }
  await (await users()).updateOne({ email }, { $unset: { jobStatus: "" } });
  return migrated;
}

export async function getUserJobs(email: string): Promise<UserJobDoc[]> {
  await migrateUserIfNeeded(email);
  return (await userJobs()).find({ email }).toArray();
}

export async function setUserJob(
  email: string,
  url: string,
  status: FiledStatus,
  job: Job,
): Promise<void> {
  await (await userJobs()).updateOne(
    { email, url },
    { $set: { email, url, status, job, at: Date.now() }, $unset: { notifReadAt: "" } },
    { upsert: true },
  );
}

export async function clearUserJob(email: string, url: string): Promise<void> {
  await (await userJobs()).deleteOne({ email, url });
}

export async function markNotifRead(email: string, urls: string[]): Promise<void> {
  if (!urls.length) return;
  await (await userJobs()).updateMany(
    { email, url: { $in: urls } },
    { $set: { notifReadAt: Date.now() } },
  );
}

/** Migrate every user that still has an embedded jobStatus[]. Returns a summary. */
export async function migrateAllUsers(): Promise<{ users: number; rows: number }> {
  const cursor = (await users()).find(
    { jobStatus: { $exists: true } },
    { projection: { email: 1 } },
  );
  let userCount = 0;
  let rowCount = 0;
  for await (const u of cursor) {
    if (!u.email) continue;
    rowCount += await migrateUserIfNeeded(u.email);
    userCount++;
  }
  return { users: userCount, rows: rowCount };
}
