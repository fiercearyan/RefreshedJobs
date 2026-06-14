# Backend & Platform Job Board — India

A deployable Next.js app that pulls **live LinkedIn jobs** (India, last 24h) on demand and ranks
them against a backend / distributed-systems engineer profile (~4 yrs). It's the production version
of the `job-board.html` prototype: the hard-coded data is replaced by a serverless route that calls
the Apify **`valig/linkedin-jobs-scraper`** actor, so your Apify token never reaches the browser.

## Features

- **Google sign-in (required)** — the whole app is private; users authenticate with Google via
  NextAuth. Users are stored in MongoDB.
- **Per-user Apify keys** — each user can save their own Apify key (encrypted at rest) in their
  profile; their refreshes use it. If they haven't set one, refresh falls back to the shared server
  `APIFY_TOKEN`.
- **Refresh button** — pulls fresh LinkedIn roles on demand via `POST /api/refresh`.
- **Server-side match scoring** — each role gets a 0–100 score, skill chips, seniority, parsed
  years-of-experience, work-mode inference, an AI/ML-platform flag, and a one-sentence reason.
- **Filters & sort** — experience slider, seniority, backend/language, infra/platform, AI-only,
  remote-only, plus Best-match / Newest sorting (best-match blends score with closeness to your
  experience; roles within ~1.5 yrs get a highlight ring). The header stat pills (roles / strong /
  remote) are clickable filters.
- **Applied / Not-interested tracking** — per-card buttons with Active / Applied / Not-interested
  tabs, **saved to the user's account in MongoDB** so selections sync across devices and survive
  refreshes.
- **Per-device job cache** — the last pull is cached in `localStorage`, so a browser refresh
  restores it instantly without spending Apify credits; only the Refresh button re-pulls.

## Tech stack

Next.js 14 (App Router) · TypeScript · React 18 · Tailwind CSS · NextAuth (Google) · MongoDB ·
deployed on Vercel, sourced from GitHub.

## Project structure

```
app/
  api/auth/[...nextauth]/route.ts  NextAuth (Google) handler
  api/refresh/route.ts   POST/GET — auth-gated; runs Apify 4× in parallel, merges, scores, caches
  api/profile/route.ts   GET/POST — read/update phone + encrypted Apify key
  api/status/route.ts    GET/POST — per-user Applied/Not-interested (MongoDB)
  signin/page.tsx        Google sign-in screen
  profile/page.tsx       profile: phone, Apify key, sign out
  layout.tsx             wraps app in the NextAuth SessionProvider
  page.tsx               server component — serves cached snapshot to the client board
  globals.css            Tailwind + ported component styles
components/
  JobBoard.tsx           the full UI (header, filters, cards, refresh, tracking, user menu)
  Providers.tsx          client SessionProvider wrapper
lib/
  apify.ts               Apify run-sync-get-dataset-items client (4 searches)
  normalize.ts           map raw items → UI jobs, dedupe by URL, collapse repost spam
  scoring.ts             work-mode/seniority/exp inference, skill extraction, match score
  cache.ts               in-memory snapshot cache
  auth.ts                NextAuth options (Google provider, Mongo adapter, JWT)
  mongodb.ts             shared MongoClient promise
  users.ts               user-doc helpers (profile, Apify key, job status)
  crypto.ts              AES-256-GCM encrypt/decrypt for the Apify key
  types.ts               shared types
middleware.ts            protects all pages behind sign-in
vercel.json              Cron pre-warm
.env.example             all env vars (Apify, Google, Mongo, secrets)
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

### 1. MongoDB Atlas (free)

1. Create a free **M0** cluster at <https://www.mongodb.com/atlas/database>.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (Vercel's IPs are dynamic, so allow all).
4. **Connect → Drivers** → copy the connection string and put it in `MONGODB_URI`, inserting your
   password and a database name, e.g. `...mongodb.net/jobboard?retryWrites=true&w=majority`.

### 2. Google OAuth (free)

1. In <https://console.cloud.google.com/> create/select a project.
2. **APIs & Services → OAuth consent screen** → External → add yourself as a test user.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
4. **Authorized redirect URIs** — add both:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
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

Open <http://localhost:3000> → you'll be sent to **/signin** → sign in with Google. Then add your
own Apify key under **Profile** (optional) and hit **Refresh**.

> On a fresh start the board is empty (the cache is cold) — hit **Refresh** to populate it.
> Each refresh runs the Apify actor four times, which can take 30–60s.

## How `/api/refresh` works

It runs `valig/linkedin-jobs-scraper` **four times in parallel** via Apify's
`run-sync-get-dataset-items` REST endpoint, each with `{ location: "India", datePosted: "r86400" }`:

| Search title                  | Limit |
| ----------------------------- | ----- |
| Backend Engineer              | 20    |
| Senior Software Engineer      | 20    |
| Platform Engineer             | 15    |
| Software Development Engineer | 15    |

Results are merged, **deduped by job URL**, repost spam (same company + title across cities) is
collapsed into one card, fields are extracted, the match score + reason are computed server-side,
and the route returns `{ jobs: [...], refreshedAt: ISOString }`. The route sets
`maxDuration = 60` and `dynamic = "force-dynamic"`. If one search fails the others still return; if
everything fails but a cached snapshot exists, the cached data is returned with a soft error.

## Deploy to GitHub + Vercel

1. **Push to GitHub** (a git repo with an initial commit is already created in this folder):
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```
2. **Import on Vercel** — New Project → import the repo. The framework auto-detects as Next.js.
3. **Add env vars** — Vercel → Settings → Environment Variables, for **Production** and **Preview**:
   `APIFY_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `MONGODB_URI`,
   `ENCRYPTION_SECRET` (and optional `REFRESH_SECRET`). Set `NEXTAUTH_URL` to your deployment URL
   (e.g. `https://your-app.vercel.app`).
4. **Update Google OAuth** — add `https://<your-vercel-domain>/api/auth/callback/google` to the
   Authorized redirect URIs (step 2 above), and confirm `0.0.0.0/0` is allowed in MongoDB Atlas.
5. **Deploy**, open the live URL, sign in with Google, and confirm **Refresh** returns jobs.

## Optional upgrades

- **Vercel Cron pre-warm** — currently **disabled** (`"crons": []` in `vercel.json`) so it doesn't
  spend Apify credits automatically; refresh manually with the button instead. To re-enable a daily
  pre-warm, add this to `crons` (Hobby allows one run/day; Pro can do more, e.g. `30 1,13 * * *`):
  ```json
  { "path": "/api/refresh", "schedule": "30 1 * * *" }
  ```
- **Secret token on `/api/refresh`** — set `REFRESH_SECRET` and the endpoint requires
  `?token=<value>` (or an `x-refresh-token` header), so it can't be hammered publicly. Leave it
  unset to disable. (If you enable it, the cron URL and the client fetch must include the token.)
- **Persistent jobs snapshot** — Applied/Not-interested already persists per user in MongoDB. The
  shared in-memory job cache (`lib/cache.ts`) still doesn't survive cold starts; if you want the
  *latest pull* to persist server-side too, store it in MongoDB or [Vercel KV](https://vercel.com/docs/storage/vercel-kv)
  instead of the module variable. (The client also keeps a per-device `localStorage` copy, so a
  browser refresh already restores the last pull without re-hitting Apify.)

## Notes

- The token is read only in `app/api/refresh/route.ts` (`process.env.APIFY_TOKEN`) — it is never
  imported into client code, so it stays out of the browser bundle.
- Match scores and experience parsing are heuristic estimates based on the candidate profile in
  `lib/scoring.ts` — tweak the dictionaries and rubric there to retune.
