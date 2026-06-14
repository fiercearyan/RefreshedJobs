# Backend & Platform Job Board — India

A deployable Next.js app that pulls **live LinkedIn jobs** (India, last 24h) on demand and ranks
them against a backend / distributed-systems engineer profile (~4 yrs). It's the production version
of the `job-board.html` prototype: the hard-coded data is replaced by a serverless route that calls
the Apify **`valig/linkedin-jobs-scraper`** actor, so your Apify token never reaches the browser.

## Features

- **Refresh button** — pulls fresh LinkedIn roles on demand via `POST /api/refresh`.
- **Server-side match scoring** — each role gets a 0–100 score, skill chips, seniority, parsed
  years-of-experience, work-mode inference, an AI/ML-platform flag, and a one-sentence reason.
- **Filters & sort** — experience slider, seniority, backend/language, infra/platform, AI-only,
  remote-only, plus Best-match / Newest sorting (best-match blends score with closeness to your
  experience; roles within ~1.5 yrs get a highlight ring).
- **Applied / Not-interested tracking** — per-card buttons with Active / Applied / Not-interested
  tabs. Persisted in `localStorage` under `jobStatusV1`, keyed by job URL so selections survive
  refreshes.
- **Cache so the page isn't blank** — the latest pull is cached in memory and served on first load.

## Tech stack

Next.js 14 (App Router) · TypeScript · React 18 · Tailwind CSS · deployed on Vercel, sourced from GitHub.

## Project structure

```
app/
  api/refresh/route.ts   POST/GET — runs Apify 4× in parallel, merges, scores, caches
  layout.tsx
  page.tsx               server component — serves cached snapshot to the client board
  globals.css            Tailwind + ported component styles
components/
  JobBoard.tsx           the full UI (header, filters, cards, refresh, tracking)
lib/
  apify.ts               Apify run-sync-get-dataset-items client (4 searches)
  normalize.ts           map raw items → UI jobs, dedupe by URL, collapse repost spam
  scoring.ts             work-mode/seniority/exp inference, skill extraction, match score
  cache.ts               in-memory snapshot cache
  types.ts               shared types
vercel.json              Cron pre-warm
.env.example             APIFY_TOKEN (+ optional REFRESH_SECRET)
```

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Apify token. Copy the example env file and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   Then set `APIFY_TOKEN` in `.env.local` (get it from
   <https://console.apify.com/account/integrations>). `.env.local` is git-ignored — never commit it.
3. Run the dev server:
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000> and click **Refresh** to pull live jobs.

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
3. **Add the env var** — Vercel → Settings → Environment Variables → add `APIFY_TOKEN`
   (and optionally `REFRESH_SECRET`) for **Production** and **Preview**.
4. **Deploy**, then open the live URL and confirm the **Refresh** button returns jobs.

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
- **Vercel KV for persistence** — the in-memory cache (`lib/cache.ts`) doesn't survive cold starts.
  Swap it for [Vercel KV](https://vercel.com/docs/storage/vercel-kv) to persist the latest jobs
  snapshot across instances, and optionally store the Applied/Not-interested map there (keyed by a
  user/device id) for cross-device sync instead of `localStorage`.

## Notes

- The token is read only in `app/api/refresh/route.ts` (`process.env.APIFY_TOKEN`) — it is never
  imported into client code, so it stays out of the browser bundle.
- Match scores and experience parsing are heuristic estimates based on the candidate profile in
  `lib/scoring.ts` — tweak the dictionaries and rubric there to retune.
