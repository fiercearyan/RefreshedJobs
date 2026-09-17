/* ==========================================================================
   OpenRoles — shared UI types and helpers.

   These describe the *view model* only. Nothing here fetches, filters or
   persists anything: the board containers keep doing all of that and pass
   the results down.
   ========================================================================== */

export type Theme = 'light' | 'dark';
export type Density = 'tight' | 'default' | 'comfortable';

/** The five buckets already used by /api/status. */
export type JobStatus = 'active' | 'applied' | 'saved' | 'hidden' | 'closed';

/** One row in the results list. */
export interface RoleRow {
  id: string;
  match: number;
  title: string;
  company: string;
  /** Show the AI / ML pill. */
  ai?: boolean;
  /**
   * Leading mono value on the meta line.
   * Main board: required experience ("4+ yrs"). High Pay: pay range ("₹35–55L").
   */
  pay?: string;
  /** Pre-joined meta string — location · mode · seniority · age. */
  meta: string;
  skills: string[];
  /** One-line fit explanation. Hidden when showFitLine is false. */
  fit?: string;
  applicants?: string;
  /** LinkedIn posting URL. */
  url: string;
  /** Company careers-page URL. */
  careersUrl?: string;
  /** Current bucket for this job; drives which action button reads as active. */
  status: JobStatus;
}

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface ChipOption {
  value: string;
  label: string;
}

/** Match-score colour band: 90+ good, 80+ accent, below that muted. */
export function matchTone(match: number): '' | 'is-strong' | 'is-fair' {
  if (match >= 90) return 'is-strong';
  if (match >= 80) return 'is-fair';
  return '';
}

/** Row padding for the density prop. */
export const DENSITY_PAD: Record<Density, string> = {
  tight: '10px',
  default: '15px',
  comfortable: '20px',
};

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** The action buttons on each row, in display order. */
export const ROW_ACTIONS: Array<{ status: Exclude<JobStatus, 'active'>; on: string; off: string }> = [
  { status: 'applied', on: 'Applied', off: 'Applied' },
  { status: 'saved', on: 'Saved', off: 'Saved' },
  { status: 'hidden', on: 'Not interested', off: 'Hide' },
  { status: 'closed', on: 'Closed', off: 'Closed' },
];

export const STATUS_TABS: Array<SegmentOption<JobStatus>> = [
  { value: 'active', label: 'Active' },
  { value: 'applied', label: 'Applied' },
  { value: 'saved', label: 'Saved' },
  { value: 'hidden', label: 'Not interested' },
  { value: 'closed', label: 'Closed' },
];

export const POSTED_WITHIN = ['3h', '6h', '12h', '24h', '2d', '3d', '7d'] as const;

export const SENIORITY = ['Entry', 'Mid', 'Senior', 'Staff'] as const;

export const SKILLS = [
  'Java', 'Spring Boot', 'Go', 'Python', 'Scala', 'Node.js', 'Kubernetes',
  'Docker', 'AWS', 'Kafka', 'Redis', 'Microservices', 'CI/CD', 'Observability',
  'ML Platform',
] as const;

export const PAY_BANDS = ['₹50L+', '₹35–50L', '₹25–35L'] as const;

export const SECTORS = [
  'Big Tech GCC',
  'Global SaaS & Infra',
  'India Product & Fintech',
  'BFSI & Payments',
  'HFT & Quant',
  'Semiconductor',
  'Retail / Airlines / Industrial',
] as const;
