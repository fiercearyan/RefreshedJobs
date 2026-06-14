import type { ApifyJob, Job } from "./types";
import {
  detectAi,
  extractSkills,
  inferWorkMode,
  mapSeniority,
  parseExperience,
  scoreJob,
} from "./scoring";

function cleanUrl(raw?: string): string {
  if (!raw) return "";
  // Strip query/tracking params so the URL is a stable localStorage key.
  return raw.split("?")[0].replace(/\/+$/, "");
}

function toIso(j: ApifyJob): string {
  if (j.postedDate && /^\d{4}-\d{2}-\d{2}/.test(j.postedDate)) {
    return j.postedDate.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/** Map a single raw Apify item to the normalized UI Job. */
export function mapJob(j: ApifyJob): Job | null {
  const url = cleanUrl(j.url || j.applyUrl);
  const title = (j.title ?? "").trim();
  const company = (j.companyName ?? "").trim();
  if (!url || !title || !company) return null;

  const mode = inferWorkMode(j);
  const sen = mapSeniority(j);
  const { exp, expTxt } = parseExperience(j);
  const ai = detectAi(j);
  const { lang, infra } = extractSkills(j);
  const { score, reason } = scoreJob(j, { sen, exp, ai, lang, infra });

  return {
    t: title,
    c: company,
    loc: (j.location ?? "India").trim(),
    mode,
    when: (j.postedTimeAgo ?? "recently").trim(),
    iso: toIso(j),
    sen,
    exp,
    expTxt,
    ai,
    score,
    lang,
    infra,
    reason,
    app: (j.applicationsCount ?? "—").trim(),
    url,
  };
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Merge raw items from all four searches into a clean, scored, sorted list:
 *  1. map + drop unusable items
 *  2. dedupe by stable job URL
 *  3. collapse near-identical location-spam reposts (same company + title) into one card
 */
export function normalizeJobs(raw: ApifyJob[]): Job[] {
  const byUrl = new Map<string, Job>();
  for (const item of raw) {
    const job = mapJob(item);
    if (!job) continue;
    if (!byUrl.has(job.url)) byUrl.set(job.url, job);
  }

  // Collapse company+title duplicates (LinkedIn often reposts one role across cities).
  const byCompanyTitle = new Map<string, Job>();
  for (const job of byUrl.values()) {
    const key = `${normKey(job.c)}::${normKey(job.t)}`;
    const existing = byCompanyTitle.get(key);
    if (!existing) {
      byCompanyTitle.set(key, job);
      continue;
    }
    // Keep the higher-scoring / more recent copy; note multiple locations.
    const keep =
      job.score !== existing.score
        ? job.score > existing.score
          ? job
          : existing
        : job.iso > existing.iso
          ? job
          : existing;
    const other = keep === job ? existing : job;
    if (keep.loc && other.loc && normKey(keep.loc) !== normKey(other.loc)) {
      keep.loc = `${keep.loc} +more`;
    }
    byCompanyTitle.set(key, keep);
  }

  return Array.from(byCompanyTitle.values()).sort((a, b) => b.score - a.score);
}
