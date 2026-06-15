// ---- User-editable search configuration (v3) ----
// Controls WHAT gets fetched from Apify on refresh. Saved per user in MongoDB.

export type Freshness = "3h" | "6h" | "12h" | "24h" | "2d" | "3d" | "7d";

export interface RoleSearch {
  title: string;
  limit: number;
}

export interface SearchConfig {
  locations: string[]; // 1–2 locations
  freshness: Freshness;
  roles: RoleSearch[];
}

export const FRESHNESS_OPTIONS: Freshness[] = ["3h", "6h", "12h", "24h", "2d", "3d", "7d"];

// LinkedIn's f_TPR param is "posted within N seconds".
export const FRESHNESS_SECONDS: Record<Freshness, number> = {
  "3h": 10800,
  "6h": 21600,
  "12h": 43200,
  "24h": 86400,
  "2d": 172800,
  "3d": 259200,
  "7d": 604800,
};

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  "3h": "3 hours",
  "6h": "6 hours",
  "12h": "12 hours",
  "24h": "24 hours",
  "2d": "2 days",
  "3d": "3 days",
  "7d": "7 days",
};

// Caps to bound Apify cost and stay within the 60s serverless budget.
export const MAX_ROLES = 5;
export const MAX_LOCATIONS = 2;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 25;
export const MAX_LOCATION_LEN = 80;
export const MAX_TITLE_LEN = 80;

export const DEFAULT_CONFIG: SearchConfig = {
  locations: ["India"],
  freshness: "24h",
  roles: [
    { title: "Backend Engineer", limit: 20 },
    { title: "Senior Software Engineer", limit: 20 },
    { title: "Platform Engineer", limit: 15 },
    { title: "Software Development Engineer", limit: 15 },
  ],
};

/** Clamp/validate arbitrary input into a safe SearchConfig (server-side authority). */
export function sanitizeConfig(input: unknown): SearchConfig {
  const obj = (input ?? {}) as Record<string, unknown>;

  // Accept new `locations` array, or migrate the old single `location` string.
  let rawLocs: unknown[] = [];
  if (Array.isArray(obj.locations)) rawLocs = obj.locations;
  else if (typeof obj.location === "string") rawLocs = [obj.location];
  const seen = new Set<string>();
  let locations = rawLocs
    .map((l) => (typeof l === "string" ? l.trim().slice(0, MAX_LOCATION_LEN) : ""))
    .filter((l) => l.length > 0)
    .filter((l) => {
      const k = l.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX_LOCATIONS);
  if (locations.length === 0) locations = [...DEFAULT_CONFIG.locations];

  const freshness: Freshness = FRESHNESS_OPTIONS.includes(obj.freshness as Freshness)
    ? (obj.freshness as Freshness)
    : DEFAULT_CONFIG.freshness;

  const rawRoles = Array.isArray(obj.roles) ? obj.roles : [];
  let roles: RoleSearch[] = rawRoles
    .map((r) => {
      const rr = (r ?? {}) as Record<string, unknown>;
      const title = typeof rr.title === "string" ? rr.title.trim().slice(0, MAX_TITLE_LEN) : "";
      const n = Math.round(Number(rr.limit));
      const limit = Number.isFinite(n) ? Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, n)) : 10;
      return { title, limit };
    })
    .filter((r) => r.title.length > 0)
    .slice(0, MAX_ROLES);

  if (roles.length === 0) roles = DEFAULT_CONFIG.roles;

  return { locations, freshness, roles };
}
