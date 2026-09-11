import type { ApifyJob } from "./types";
import { normalizeJobs } from "./normalize";
import { matchHighPayCompany } from "./highPayCompanies";
import type { HighPayJob } from "./highPayTypes";

/**
 * Reuse the normal board's scoring/dedupe pipeline, then keep only the jobs
 * whose employer resolves to a High Pay Radar company and tag each one with its
 * pay band / tier / sector.
 *
 * Sorted by tier first (₹50L+ before ₹35–50L before ₹25–35L) and match score
 * inside a tier — the whole point of this board is pay, not just fit.
 */
export function normalizeHighPayJobs(raw: ApifyJob[]): HighPayJob[] {
  const scored = normalizeJobs(raw);

  const out: HighPayJob[] = [];
  for (const j of scored) {
    const c = matchHighPayCompany(j.c);
    if (!c) continue;
    out.push({ ...j, hp: { n: c.n, p: c.p, t: c.t, cat: c.cat, u: c.u } });
  }

  return out.sort((a, b) => b.hp.t - a.hp.t || b.score - a.score);
}
