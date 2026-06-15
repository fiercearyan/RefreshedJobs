// ---- Raw item shape returned by valig/linkedin-jobs-scraper ----
// (fields observed from the actor's output schema / README example)
export interface ApifyJob {
  id?: string;
  url?: string;
  title?: string;
  location?: string;
  companyName?: string;
  companyUrl?: string;
  recruiterName?: string;
  recruiterUrl?: string;
  experienceLevel?: string; // "Internship" | "Entry level" | "Associate" | "Mid-Senior level" | "Director" | "Executive" | "Not Applicable"
  contractType?: string;
  workType?: string;
  sector?: string;
  salary?: string;
  applyType?: string;
  applyUrl?: string;
  postedTimeAgo?: string;
  postedDate?: string; // ISO-ish "2025-04-30"
  applicationsCount?: string;
  description?: string;
  descriptionHtml?: string;
  [key: string]: unknown;
}

export type WorkMode = "Remote" | "Hybrid" | "Onsite";
export type Seniority = "Entry" | "Mid" | "Senior" | "Staff";

// ---- Normalized job consumed by the UI (mirrors the prototype's JOBS shape) ----
export interface Job {
  t: string; // title
  c: string; // company
  loc: string; // location
  mode: WorkMode;
  when: string; // postedTimeAgo
  iso: string; // ISO date
  sen: Seniority;
  exp: number | null; // years required (parsed)
  expTxt: string; // human label for years required
  ai: boolean; // AI / ML-platform flag
  score: number; // 0-100 match score
  lang: string[]; // backend & language skills
  infra: string[]; // infra & platform skills
  reason: string; // one-sentence match reason (may contain <b> tags)
  app: string; // applicants line
  url: string; // stable job URL (dedupe + localStorage key)
}

import type { SearchConfig } from "./searchConfig";

export interface RefreshResponse {
  jobs: Job[];
  refreshedAt: string; // ISO string
  config?: SearchConfig; // the config used for this pull
}
