# OpenRoles

A private, deployable Next.js app that pulls **live LinkedIn jobs** on demand and ranks them
against a backend / distributed-systems engineer profile (~4 yrs). It started as the single-file
`job-board.html` prototype; the hard-coded data is now replaced by a serverless route that calls the
Apify **`valig/linkedin-jobs-scraper`** actor, with Google login, MongoDB, and per-user settings.

Tagline: *Find the right role…Faster.*

## Features

- **Google sign-in (required)** — the whole app is private; users authenticate with Google via
  NextAuth and are stored in MongoDB.
- **Per-user search settings** — a Settings modal lets each user choose **1–2 locations**, a
  **freshness window** (3h / 6h / 12h / 24h / 2d / 3d / 7d), and **up to 5 role titles** (each with
  its own result limit). Saved to the account and reused on every refresh until changed.
- **Per-user Apify keys** — each user can save their own Apify key (encrypted at rest) in their
  profile; their refreshes use it. If none is set, refresh falls back to the shared `APIFY_TOKEN`.
- **Refresh button** — pulls fresh LinkedIn roles on demand via `POST /api/refresh`.
- **Server-side match scoring** — each role gets a 0–100 score, skill chips, seniority, parsed
  years-of-experience, work-mode inference, an AI/ML-platform flag, and a one-sentence reason.
- **Filters & sort** — experience slider (with "hide roles needing > my exp"), seniority,
  backend/language, infra/platform, AI-only, remote-only. Active sorts by Best-match / Newest;
  the Applied/Saved/Not-interested tabs sort by Recent (most recently filed first) / A–Z. The header
  stat pills (roles / strong / remote) are clickable filters.
- **Applied / Saved / Not-interested tabs** — per-card buttons file a job into one of three states
  (a job lives in exactly one tab). Filed jobs are hidden from Active and persist across refreshes;
  unsaving / moving back returns the job to Active. The Saved tab also has a quick **Applied** action.
- **Cross-device sync** — everything per-user lives in MongoDB: the latest jobs snapshot, the
  Applied/Saved/Not-interested map (with filed timestamps), search settings, profile + Apify key.
  The page server-renders the snapshot, so any device shows the same last pull without re-spending
  Apify credits.
- **Theming** — dark by default with a light toggle in the navbar (remembered, no flash). Global
  navbar (logo left · OpenRoles center · theme toggle + profile right), custom SVG logo + favicon.
- **Saved-job notifications** — an in-app navbar bell with a red dot when a saved job has been on
  your list for ≥12h. Clicking marks it read (synced across devices); it re-fires 12h later while
  still saved, and clears once you apply or unsave. One reminder per job; web-only, no email.
- **Profile** — account info, optional phone, encrypted Apify key, and activity counts
  (Applied / Saved / Not-interested).

## Tech stack

Next.js 14 (App Router) · TypeScript · React 18 · Tailwind CSS · NextAuth (Google) · MongoDB Atlas ·
Apify · deployed on Vercel, sourced from GitHub.

## Project structure

```
app/
  api/auth/[...nextauth]/route.ts  NextAuth (Google) handler
  api/refresh/route.ts    POST/GET — auth-gated; runs the user's role×location searches, scores,
                          caches, and saves the snapshot to MongoDB
  api/search-config/route.ts  GET/POST — read/update the user's location/freshness/roles
  api/status/route.ts     GET/POST — per-user Applied/Saved/Not-interested (+ filed timestamps)
  api/notifications/route.ts  POST — mark saved-job reminders read
  api/profile/route.ts    GET/POST — phone + encrypted Apify key
  api/health/route.ts     public env diagnostic (booleans only, no secrets)
  signin/page.tsx         Google sign-in screen
  profile/page.tsx        profile: counts, phone, Apify key, sign out
  page.tsx                server component — reads the user's jobs snapshot from MongoDB
  layout.tsx              SessionProvider + navbar + no-flash theme script
  icon.svg                favicon (OpenRoles logo)
  globals.css            Tailwind + themed component styles (CSS variables, dark/light)
components/
  JobBoard.tsx            the full board (header, filters, cards, tabs, refresh, settings)
  SearchSettings.tsx      the Settings modal (locations, freshness, roles)
  Navbar.tsx              global navbar + theme toggle
  NotificationBell.tsx    saved-job reminder bell (12h, red dot, read-on-open)
  Logo.tsx                inline SVG logo
  Providers.tsx           client SessionProvider wrapper
lib/
  apify.ts                Apify run-sync-get-dataset-items client (role × location, f_TPR freshness)
  searchConfig.ts         search-config types, defaults, caps, validation
  normalize.ts            map raw items → UI jobs, dedupe by URL, collapse repost spam
  scoring.ts              work-mode/seniority/exp inference, skill extraction, match score
  cache.ts                in-memory snapshot cache (error-fallback)
  auth.ts                 NextAuth options (Google provider, Mongo adapter, JWT)
  mongodb.ts              shared MongoClient promise
  users.ts                user-doc helpers (profile, Apify key, statuses, snapshot, config)
  crypto.ts               AES-256-GCM encrypt/decrypt for the Apify key
  types.ts                shared types
middleware.ts             protects all pages behind sign-in
vercel.json               cron config (disabled by default)
.env.example              all env vars (Apify, Google, Mongo, secrets)
```

## Environment variables

Copy the example file and fill every value: `cp .env.example .env.local` (git-ignored — never commit).

| Var                  | What it's for                                                              |
| -------------------- | -------------------------------------------------------------------------- |
| `APIFY_TOKEN`        | Shared fallback Apify token (used when a user has no key of their own)      |
| `GOOGLE_CLIENT_ID`   | Google OAuth client ID                                                      |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                                               |
| `NEXTAUTH_URL`       | App base URL (`http://localhost:3000` locally; your Vercel URL in prod)     |
| `NEXTAUTH_SECRET`    | Signs session JWTs — `openssl rand -base64 32`                              |
| `MONGODB_URI`        | MongoDB Atlas connection string (include a db name, e.g. `/jobboard`)       |
| `ENCRYPTION_SECRET`  | Encrypts each user's Apify key at rest — `openssl rand -hex 32`             |
| `REFRESH_SECRET`     | Optional — adds a token gate on `/api/refresh`                              |

Visit `/api/health` on any deployment to confirm which of these the running instance can see
(booleans only — it never prints secret values).

### 1. MongoDB Atlas (free)

1. Create a free **M0** cluster at <https://www.mongodb.com/atlas/database>.
2. **Database Access** → add a database user (username + password; letters/numbers avoid URL-encoding).
3. **Network Access** → add IP `0.0.0.0/0` (Vercel's IPs are dynamic, so allow all).
4. **Connect → Drivers (Node.js)** → copy the string into `MONGODB_URI`, inserting your password and
   a database name, e.g. `...mongodb.net/jobboard?retryWrites=true&w=majority`.

### 2. Google OAuth (free)

1. In <https://console.cloud.google.com/> create/select a project.
2. **APIs & Services → OAuth consent screen** → External → add yourself as a test user.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
4. **Authorized redirect URIs** — add one per domain you'll use:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
   - For a Vercel preview branch, add the stable alias:
     `https://<project>-git-<branch>-<scope>.vercel.app/api/auth/callback/google`
5. Copy the client ID/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### 3. Generate the secrets

```bash
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -hex 32      # ENCRYPTION_SECRET
```

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in all values (see above)
npm run dev
```

Open <http://localhost:3000> → you'll be sent to **/signin** → sign in with Google. Open **Settings**
to set your locations / freshness / roles, optionally add your own Apify key under **Profile**, then
hit **Refresh**.

> On a brand-new account the board is empty — hit **Refresh** to populate it. Each refresh runs the
> Apify actor once per role × location, which can take 30–60s.

## How `/api/refresh` works

It reads the signed-in user's saved search config and runs `valig/linkedin-jobs-scraper` once per
**role × location**, in parallel, via Apify's `run-sync-get-dataset-items` REST endpoint. Freshness
is applied with the LinkedIn `f_TPR` URL param (seconds), which supports 3h–7d (the actor's built-in
`datePosted` only offers 24h/7d/30d). Results are merged, **deduped by job URL**, repost spam (same
company + title across cities) is collapsed, fields are extracted, the match score + reason are
computed server-side, and the route returns `{ jobs, refreshedAt, config }`. It also **saves the
snapshot to the user's MongoDB document** so other devices pick it up. The route sets
`maxDuration = 60` and `dynamic = "force-dynamic"`. If one search fails the others still return; if
everything fails but a cached snapshot exists, the cached data is returned with a soft error.

> Cost note: results = up to `5 roles × 2 locations` Apify runs per refresh. More roles/locations =
> more credits and longer refreshes; the caps keep it within the 60s budget.

## Deploy to GitHub + Vercel

1. **Push to GitHub:**
   ```bash
   git push -u origin main
   ```
2. **Import on Vercel** — New Project → import the repo (framework auto-detects as Next.js).
3. **Add env vars** — Vercel → Settings → Environment Variables, for **Production** and **Preview**:
   `APIFY_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `MONGODB_URI`,
   `ENCRYPTION_SECRET` (and optional `REFRESH_SECRET`). Set `NEXTAUTH_URL` to your deployment URL.
4. **Update Google OAuth** — add the production (and any preview-branch) callback URLs, and confirm
   `0.0.0.0/0` is allowed in MongoDB Atlas.
5. **Redeploy after changing env vars** (Vercel only injects them into new deployments), then sign in
   and confirm **Refresh** returns jobs.

## Branching & releases

Work happens on `vX-dev` branches, merged into `main` and tagged once verified in production.

| Tag    | What shipped                                                                              |
| ------ | ----------------------------------------------------------------------------------------- |
| v1.0   | Live job board + Google login + MongoDB + per-user encrypted Apify keys                   |
| v2.0   | OpenRoles rebrand: dark theme + light toggle, global navbar, custom logo, redesigned sign-in |
| v3.1   | Per-user search config (location, freshness 3h–7d, up to 5 roles) via Settings modal      |
| v3.2   | Saved tab + per-card Save, profile activity counts                                        |
| v3.3   | New tagline, unsave returns job to Active (+ Apply in Saved), Recent/A–Z sort in filed tabs |
| v3.4   | Fixed exp filter, cross-device jobs-snapshot sync via MongoDB, favicon + tab title        |
| v4.0   | In-app saved-job notification bell — 12h reminders, red dot, read-on-open, 12h re-fire     |

## Optional / future

- **Vercel Cron pre-warm** — disabled (`"crons": []`) so it doesn't spend Apify credits
  automatically. To re-enable a daily pre-warm (Hobby allows one/day; Pro more):
  ```json
  { "path": "/api/refresh", "schedule": "30 1 * * *" }
  ```
- **Secret token on `/api/refresh`** — set `REFRESH_SECRET` to require `?token=<value>` (or an
  `x-refresh-token` header).
- **Roadmap** — editable profile (resume, skills) and more login providers.

## Notes

- The Apify token (shared or per-user) is only read server-side; it never reaches the client bundle.
- Match scores and experience parsing are heuristic estimates based on the candidate profile in
  `lib/scoring.ts` — tweak the dictionaries and rubric there to retune.
