import JobBoard from "@/components/JobBoard";
import { getCachedJobs } from "@/lib/cache";

// Always render fresh so the cached snapshot (if any) is read on each request.
export const dynamic = "force-dynamic";

export default function Page() {
  // Serve the most recent cached pull immediately so the page isn't blank.
  // On a cold start this is null and the board prompts the user to hit Refresh.
  const initial = getCachedJobs();
  return <JobBoard initialJobs={initial?.jobs ?? []} initialRefreshedAt={initial?.refreshedAt ?? null} />;
}
