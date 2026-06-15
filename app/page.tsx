import JobBoard from "@/components/JobBoard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users";
import type { Job } from "@/lib/types";

// Always render fresh so the per-user snapshot is read on each request.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Serve the user's last saved snapshot from MongoDB so every device shows the
  // same jobs without re-hitting Apify. On a cold/new account it's empty and the
  // board prompts the user to hit Refresh.
  let initialJobs: Job[] = [];
  let initialRefreshedAt: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (email) {
      const user = await getUserByEmail(email);
      if (user?.jobsSnapshot?.jobs?.length) {
        initialJobs = user.jobsSnapshot.jobs;
        initialRefreshedAt = user.jobsSnapshot.refreshedAt ?? null;
      }
    }
  } catch {
    /* DB unreachable — render empty board, Refresh still works */
  }

  return <JobBoard initialJobs={initialJobs} initialRefreshedAt={initialRefreshedAt} />;
}
