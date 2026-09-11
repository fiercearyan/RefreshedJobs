import type { Collection } from "mongodb";
import clientPromise from "./mongodb";
import type { HighPayConfig } from "./highPayConfig";
import type { HighPayJob } from "./highPayTypes";

/**
 * High Pay board's slice of the `users` document. Kept in its own module (with
 * its own narrow typing of the same collection) so lib/users.ts — which the
 * normal board depends on — stays untouched.
 */
export interface HighPayUserDoc {
  email: string;
  highPayConfig?: HighPayConfig;
  highPaySnapshot?: { jobs: HighPayJob[]; refreshedAt: string };
}

async function col(): Promise<Collection<HighPayUserDoc>> {
  return (await clientPromise).db().collection<HighPayUserDoc>("users");
}

export async function getHighPayUser(email: string): Promise<HighPayUserDoc | null> {
  return (await col()).findOne(
    { email },
    { projection: { email: 1, highPayConfig: 1, highPaySnapshot: 1 } },
  );
}

export async function saveHighPayConfig(email: string, config: HighPayConfig): Promise<void> {
  await (await col()).updateOne({ email }, { $set: { highPayConfig: config } }, { upsert: true });
}

export async function saveHighPaySnapshot(
  email: string,
  jobs: HighPayJob[],
  refreshedAt: string,
): Promise<void> {
  await (await col()).updateOne({ email }, { $set: { highPaySnapshot: { jobs, refreshedAt } } });
}
