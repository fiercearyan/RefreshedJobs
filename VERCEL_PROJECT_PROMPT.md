# Build prompt — LinkedIn Backend/Platform Job Board (Next.js + Apify + Vercel)

Copy everything below the line into your AI coding assistant (Claude Code / Cursor) in the **new folder**. Keep `job-board.html` in that folder as the visual/feature reference.

---

## Goal
Turn my working single-file prototype (`job-board.html`, in this folder — use it as the source of truth for the UI, styling, filters, scoring, and the Applied/Not-interested feature) into a deployable web app on **GitHub + Vercel** that fetches **live** LinkedIn jobs on demand via a **Refresh** button.

The prototype currently has the job data hard-coded. The new app must fetch fresh data at runtime from the Apify LinkedIn scraper through a serverless backend (so my Apify token is never exposed to the browser).

## Tech stack
- **Next.js 14+ (App Router) + TypeScript**, React, plain CSS or Tailwind (port the existing CSS as-is is fine).
- Deploy target: **Vercel**. Source: **GitHub**.
- No database required for v1 (use `localStorage` for Applied/Not-interested, exactly like the prototype). Mention an optional Vercel KV upgrade for cross-device sync.

## Architecture
1. **Server route `POST /api/refresh`** (Next.js Route Handler, `app/api/refresh/route.ts`):
   - Reads `APIFY_TOKEN` from `process.env` (server-only).
   - Runs the Apify actor **`valig/linkedin-jobs-scraper`** four times **in parallel**, each input:
     ```json
     { "location": "India", "datePosted": "r86400", "limit": <N> }
     ```
     with titles/limits: "Backend Engineer" (20), "Senior Software Engineer" (20), "Platform Engineer" (15), "Software Development Engineer" (15). `r86400` = posted in last 24h.
   - Use Apify's **run-sync-get-dataset-items** REST endpoint so each call returns dataset items directly:
     `POST https://api.apify.com/v2/acts/valig~linkedin-jobs-scraper/run-sync-get-dataset-items?token=APIFY_TOKEN` with the JSON input as body.
   - Merge results, **dedupe by job URL**, collapse near-identical location-spam reposts from the same company+title into one card, extract the fields below, compute the match score + reason server-side, and return JSON `{ jobs: [...], refreshedAt: ISOString }`.
   - **Timeout handling (important):** Apify runs can take 30–60s+. Set `export const maxDuration = 60;` (Vercel Hobby allows up to 60s; Pro up to 300s) and `export const dynamic = "force-dynamic";`. If runs still risk exceeding the limit, fall back to the **async pattern**: start runs (`/v2/acts/.../runs`), return `runIds`, and add `GET /api/status?runIds=...` that the client polls until the datasets are ready. Implement the sync version first; add polling only if you hit timeouts.
2. **Caching so the page isn't blank on load:** cache the most recent `/api/refresh` result (in-memory module variable is enough for v1, or Vercel KV if you want it to survive cold starts). On first page load, serve the cached result immediately; the **Refresh** button re-invokes `/api/refresh` to get a fresh pull.
3. **Frontend (`app/page.tsx` + components):** port the entire prototype UI.

## Fields to extract per job
title, company, location, work mode (Remote / Hybrid / On-site — infer from description), job URL, postedTimeAgo, ISO date, seniority (Entry/Mid/Senior/Staff — map Internship/Entry=>Entry, Associate=>Mid, Mid-Senior=>Senior, Director/Principal/Staff=>Staff; infer from title when experienceLevel is "Not Applicable"), years of experience required (parse from description, null if absent), backend & language skills, infra & platform skills, AI/ML-platform flag, match score (0–100), one-sentence match reason.

## Match scoring (port from prototype)
Candidate profile: backend / distributed-systems engineer, ~4 yrs (IBM Watsonx Agentic AI platform, Amadeus airline financial systems). Strong in Java, Spring Boot, Scala, Go; concurrent high-performance REST microservices. Deep with Kubernetes, Docker, CI/CD (Jenkins, AWS EKS/EC2/S3), event-driven (Kafka, RabbitMQ), caching/state (Redis, MongoDB, MySQL). System design (HLD/LLD), low-latency tuning, observability (OpenTelemetry, Instana, ELK). Strong interest in AI-platform / Agentic-AI infra, model deployment, ML serving. Targets Backend, Senior SWE/SDE, Platform, AI-platform/infra at mid-to-senior level; full-stack/frontend only if results are thin.
Rubric: reward Java/Go/Scala/Spring-Boot overlap, distributed-systems/microservices, infra overlap (K8s/Kafka/AWS/CI-CD/observability), AI/ML-platform relevance; best fit when required exp is near 4 yrs and seniority is Mid/Senior; penalize internships/entry-only, very-senior (10+/Staff/Principal), and frontend/.NET/Wintel/data-engineering mismatches. Score buckets for badges: green ≥80, blue 65–79, amber 50–64, slate <50.

## UI features to preserve (all already in the prototype)
- Header stat pills (roles / strong matches / remote) reflecting the **Active** set, plus a subtitle showing "refreshed <refreshedAt>".
- **Refresh button** in the header: shows a loading state, calls `POST /api/refresh`, then re-renders. Disable while loading; show an error toast on failure. Preserve Applied/Not-interested selections across refreshes.
- Search bar.
- Sidebar: experience slider (0–20, default 4, value shown, "hide roles needing ≫ my exp" toggle), seniority filter, backend/language filter, infra/platform filter, "AI/ML-platform only" toggle, "Remote only" toggle, reset.
- Sort: Best match / Newest. Best-match blends score with closeness of required exp to the slider; cards within ~1.5 yrs get a highlight ring + "closely fits" flag.
- Cards: title, company, location + Remote/Hybrid/On-site badge, seniority, years required, posted-time, backend & infra skill chips, color-coded match-score badge, match reason, "View posting" link.
- **Applied / Not-interested tracking:** ✓ Applied and 🚫 Not interested buttons per card; Active / Applied / Not-interested tabs with live counts next to the pills; "↶ Move back to Active" in the filed tabs. Persist in `localStorage` under key `jobStatusV1` as `{ [jobURL]: "applied" | "notinterested" }`, keyed by stable job URL so selections survive refreshes. (Optional: swap to Vercel KV for cross-device.)

## Env & secrets
- `.env.local` (and Vercel project env vars): `APIFY_TOKEN=...`. Never ship the token to the client; only the server route reads it.
- Add `.env.local` to `.gitignore`. Provide a `.env.example` with `APIFY_TOKEN=`.

## Deliverables
1. Working Next.js app: `app/page.tsx`, components, `app/api/refresh/route.ts`, types, scoring util, CSS ported from the prototype.
2. `README.md` with local setup (`npm i`, set `APIFY_TOKEN`, `npm run dev`) and the deploy steps below.
3. Clean, typed, no secrets in client bundle.

## GitHub + Vercel steps to include in the README
1. `git init`, commit, push to a new GitHub repo.
2. On Vercel: New Project → import the repo → framework auto-detected (Next.js).
3. Add env var `APIFY_TOKEN` in Vercel → Settings → Environment Variables (Production + Preview).
4. Deploy. Verify the Refresh button works on the live URL.

## Optional (nice-to-have, mention but don't block v1)
- **Vercel Cron** (`vercel.json`) hitting `/api/refresh` at `30 1,13 * * *` UTC (= 7:00 AM & 7:00 PM IST) to pre-warm the cache twice daily.
- **Vercel KV** for storing the latest jobs snapshot and/or Applied state across devices.
- Basic auth / a secret query token on `/api/refresh` so it isn't publicly hammered.

Start by scaffolding the Next.js app, port the UI from `job-board.html`, then implement `/api/refresh` against Apify, then wire the Refresh button, then write the README and deploy.
