import HighPayBoard from "@/components/HighPayBoard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHighPayUser } from "@/lib/highPayUser";
import type { HighPayJob } from "@/lib/highPayTypes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "High Pay · OpenRoles",
  description:
    "Live LinkedIn roles from the High Pay Radar company list — India's top-paying employers for backend engineers.",
};

export default async function HighPayPage() {
  // Serve the user's last High Pay snapshot (its own field, separate from the
  // normal board's jobsSnapshot) so a reload doesn't re-spend Apify credits.
  let initialJobs: HighPayJob[] = [];
  let initialRefreshedAt: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (email) {
      const user = await getHighPayUser(email);
      if (user?.highPaySnapshot?.jobs?.length) {
        initialJobs = user.highPaySnapshot.jobs;
        initialRefreshedAt = user.highPaySnapshot.refreshedAt ?? null;
      }
    }
  } catch {
    /* DB unreachable — render an empty board, Refresh still works */
  }

  return <HighPayBoard initialJobs={initialJobs} initialRefreshedAt={initialRefreshedAt} />;
}
