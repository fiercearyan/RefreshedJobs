import type { Collection } from "mongodb";
import clientPromise from "./mongodb";
import type { HighPayConfig } from "./highPayConfig";
import type { HighPayJob } from "./highPayTypes";
import type { HighPayRun } from "./highPayApify";

/**
 * High Pay board's slice of the `users` document. Kept in its own module (with
 * its own narrow typing of the same collection) so lib/users.ts — which the
 * normal board depends on — stays untouched.
 */
export interface HighPayUserDoc {
  email: string;
  highPayConfig?: HighPayConfig;
  highPaySnapshot?: { jobs: HighPayJob[]; refreshedAt: string };
  /** Next unit (company batch × location) the scan should start from. */
  highPayCursor?: number;
  /** Units already covered in the current sweep of the company list. */
  highPaySwept?: number;
  /** Apify runs started and not yet collected. */
  highPayRuns?: HighPayRun[];
}

async function col(): Promise<Collection<HighPayUserDoc>> {
  return (await clientPromise).db().collection<HighPayUserDoc>("users");
}

export async function getHighPayUser(email: string): Promise<HighPayUserDoc | null> {
  return (await col()).findOne(
    { email },
    {
      projection: {
        email: 1,
        highPayConfig: 1,
        highPaySnapshot: 1,
        highPayCursor: 1,
        highPaySwept: 1,
        highPayRuns: 1,
      },
    },
  );
}

export async function saveHighPayConfig(email: string, config: HighPayConfig): Promise<void> {
  // A new company selection invalidates where we were in the sweep.
  await (await col()).updateOne(
    { email },
    { $set: { highPayConfig: config, highPayCursor: 0, highPaySwept: 0 } },
    { upsert: true },
  );
}

/** Remember the runs we're waiting on and where the sweep has reached. */
export async function saveHighPayScanState(
  email: string,
  state: { runs: HighPayRun[]; cursor: number; swept: number },
): Promise<void> {
  await (await col()).updateOne(
    { email },
    {
      $set: {
        highPayRuns: state.runs,
        highPayCursor: state.cursor,
        highPaySwept: state.swept,
      },
    },
  );
}

export async function saveHighPaySnapshot(
  email: string,
  jobs: HighPayJob[],
  refreshedAt: string,
): Promise<void> {
  await (await col()).updateOne({ email }, { $set: { highPaySnapshot: { jobs, refreshedAt } } });
}
