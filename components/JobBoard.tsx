"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job, RefreshResponse } from "@/lib/types";

type View = "active" | "applied" | "notinterested";
type Sort = "match" | "new";
type Status = Record<string, "applied" | "notinterested">;

const SKEY = "jobStatusV1"; // url -> "applied" | "notinterested"
const JKEY = "jobsCacheV1"; // last successful pull { jobs, refreshedAt }
const FKEY = "filedJobsV1"; // url -> Job, for jobs marked applied/not-interested
const SEN_ORDER: Job["sen"][] = ["Entry", "Mid", "Senior", "Staff"];
const LANG_PREF = ["Java", "Spring Boot", "Go", "Scala", "Python", "C++", "Node.js", "TypeScript"];
const INFRA_PREF = [
  "Kubernetes",
  "Docker",
  "AWS",
  "Kafka",
  "CI/CD",
  "Terraform",
  "Microservices",
  "Distributed Systems",
  "Observability",
  "ML Platform",
  "MLOps",
  "Redis",
];

const CANDIDATE_EXP = 4;

function scoreClass(s: number) {
  return s >= 80 ? "s-green" : s >= 65 ? "s-blue" : s >= 50 ? "s-amber" : "s-slate";
}
function modeClass(m: string) {
  return m === "Remote" ? "remote" : m === "Hybrid" ? "hybrid" : "onsite";
}

function fmtRefreshed(iso: string | null): string {
  if (!iso) return "not yet refreshed";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JobBoard({
  initialJobs,
  initialRefreshedAt,
}: {
  initialJobs: Job[];
  initialRefreshedAt: string | null;
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(initialRefreshedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filter / sort / view state
  const [q, setQ] = useState("");
  const [sen, setSen] = useState<Set<string>>(new Set());
  const [lang, setLang] = useState<Set<string>>(new Set());
  const [infra, setInfra] = useState<Set<string>>(new Set());
  const [ai, setAi] = useState(false);
  const [remote, setRemote] = useState(false);
  const [strong, setStrong] = useState(false);
  const [exp, setExp] = useState(CANDIDATE_EXP);
  const [expFilter, setExpFilter] = useState(false);
  const [sort, setSort] = useState<Sort>("match");
  const [view, setView] = useState<View>("active");

  // applied / not-interested, persisted by stable job URL
  const [status, setStatus] = useState<Status>({});
  // archive of filed (applied / not-interested) jobs, so they survive a new pull
  const [archive, setArchive] = useState<Record<string, Job>>({});

  // On mount, restore everything from localStorage so a browser refresh does NOT
  // hit Apify: the last pull, the filed-job archive, and the status map.
  useEffect(() => {
    try {
      setStatus(JSON.parse(localStorage.getItem(SKEY) || "{}"));
    } catch {
      /* ignore */
    }
    try {
      setArchive(JSON.parse(localStorage.getItem(FKEY) || "{}"));
    } catch {
      /* ignore */
    }
    try {
      const cached = JSON.parse(localStorage.getItem(JKEY) || "null");
      if (cached && Array.isArray(cached.jobs) && cached.jobs.length) {
        setJobs(cached.jobs);
        setRefreshedAt(cached.refreshedAt ?? null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function setAct(job: Job, val: "" | "applied" | "notinterested") {
    setStatus((prev) => {
      const next = { ...prev };
      if (val) next[job.url] = val;
      else delete next[job.url];
      try {
        localStorage.setItem(SKEY, JSON.stringify(next));
      } catch {
        /* ignore quota / private-mode errors */
      }
      return next;
    });
    setArchive((prev) => {
      const next = { ...prev };
      if (val) next[job.url] = job;
      else delete next[job.url];
      try {
        localStorage.setItem(FKEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = (await res.json()) as RefreshResponse & { error?: string };
      if (!res.ok && !data.jobs) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (data.jobs) {
        setJobs(data.jobs);
        setRefreshedAt(data.refreshedAt);
        // Persist so a browser refresh restores these without calling Apify again.
        try {
          localStorage.setItem(
            JKEY,
            JSON.stringify({ jobs: data.jobs, refreshedAt: data.refreshedAt }),
          );
        } catch {
          /* ignore quota errors */
        }
      }
      if (data.error) setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  // dynamic filter option sets, derived from the current jobs
  const { topLang, topInfra } = useMemo(() => {
    const langSet = new Set<string>();
    const infraSet = new Set<string>();
    jobs.forEach((j) => {
      j.lang.forEach((s) => langSet.add(s));
      j.infra.forEach((s) => infraSet.add(s));
    });
    return {
      topLang: LANG_PREF.filter((x) => langSet.has(x)),
      topInfra: INFRA_PREF.filter((x) => infraSet.has(x)),
    };
  }, [jobs]);

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) {
    setter((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  }

  function expBonus(j: Job) {
    if (j.exp == null) return 4;
    return Math.max(0, 12 - 3 * Math.abs(j.exp - exp));
  }
  function isExpFit(j: Job) {
    return j.exp != null && Math.abs(j.exp - exp) <= 1.5;
  }
  function searchHay(j: Job) {
    return `${j.t} ${j.c} ${j.loc} ${j.sen} ${j.lang.join(" ")} ${j.infra.join(" ")}`.toLowerCase();
  }
  function passes(j: Job) {
    if (ai && !j.ai) return false;
    if (remote && j.mode !== "Remote") return false;
    if (strong && j.score < 80) return false;
    if (sen.size && !sen.has(j.sen)) return false;
    if (lang.size && !j.lang.some((s) => lang.has(s))) return false;
    if (infra.size && !j.infra.some((s) => infra.has(s))) return false;
    if (expFilter && j.exp != null && j.exp - exp > 3) return false;
    if (q && !searchHay(j).includes(q)) return false;
    return true;
  }

  const list = useMemo(() => {
    let l: Job[];
    if (view === "active") {
      l = jobs.filter((j) => !status[j.url] && passes(j));
    } else {
      // Union current pull + archived filed jobs (fresh copy wins) so filed jobs
      // always appear in their tab, even after a refresh that no longer returns them.
      const byUrl = new Map<string, Job>();
      Object.values(archive).forEach((j) => byUrl.set(j.url, j));
      jobs.forEach((j) => byUrl.set(j.url, j));
      l = Array.from(byUrl.values()).filter(
        (j) => status[j.url] === view && (!q || searchHay(j).includes(q)),
      );
    }
    if (sort === "new") {
      l = [...l].sort((a, b) => b.iso.localeCompare(a.iso) || b.score - a.score);
    } else {
      l = [...l].sort((a, b) => b.score + expBonus(b) - (a.score + expBonus(a)));
    }
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, archive, status, view, q, sen, lang, infra, ai, remote, strong, exp, expFilter, sort]);

  const active = useMemo(() => jobs.filter((j) => !status[j.url]), [jobs, status]);
  const counts = {
    total: active.length,
    strong: active.filter((j) => j.score >= 80).length,
    remote: active.filter((j) => j.mode === "Remote").length,
    active: active.length,
    applied: Object.values(status).filter((v) => v === "applied").length,
    not: Object.values(status).filter((v) => v === "notinterested").length,
  };

  function reset() {
    setQ("");
    setSen(new Set());
    setLang(new Set());
    setInfra(new Set());
    setAi(false);
    setRemote(false);
    setStrong(false);
    setExp(CANDIDATE_EXP);
    setExpFilter(false);
    setSort("match");
  }

  // Stat-pill actions — clicking a pill jumps to the Active set and applies its filter.
  function showAllRoles() {
    reset();
    setView("active");
  }
  function toggleStrong() {
    setView("active");
    setStrong((v) => !v);
  }
  function toggleRemotePill() {
    setView("active");
    setRemote((v) => !v);
  }

  return (
    <div className="mx-auto max-w-[1280px] px-[18px] pb-[60px] pt-5">
      {/* ---------- header ---------- */}
      <header className="mb-[18px] flex flex-wrap items-center justify-between gap-[14px]">
        <div>
          <h1 className="m-0 text-[21px] font-bold tracking-[-0.01em]">
            Backend &amp; Platform Job Board — India
          </h1>
          <p className="mt-[3px] text-[12.5px] text-muted">
            LinkedIn roles posted in the last 24h · matched to a backend / distributed-systems
            engineer (~4 yrs) · refreshed {fmtRefreshed(refreshedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill onClick={showAllRoles} title="Show all active roles">
            📋 <b className="text-brand">{counts.total}</b> roles
          </Pill>
          <Pill on={strong} onClick={toggleStrong} title="Filter to strong matches (score ≥ 80)">
            🎯 <b className={strong ? "text-white" : "text-brand"}>{counts.strong}</b> strong matches
          </Pill>
          <Pill on={remote} onClick={toggleRemotePill} title="Filter to remote roles">
            🟢 <b className={remote ? "text-white" : "text-brand"}>{counts.remote}</b> remote
          </Pill>
          <div className="ml-1 flex gap-[6px]">
            <Tab on={view === "active"} onClick={() => setView("active")}>
              Active<TabNum on={view === "active"}>{counts.active}</TabNum>
            </Tab>
            <Tab on={view === "applied"} onClick={() => setView("applied")}>
              ✓ Applied<TabNum on={view === "applied"}>{counts.applied}</TabNum>
            </Tab>
            <Tab on={view === "notinterested"} onClick={() => setView("notinterested")}>
              🚫 Not interested<TabNum on={view === "notinterested"}>{counts.not}</TabNum>
            </Tab>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="ml-1 inline-flex items-center gap-2 rounded-full bg-brand px-[15px] py-[8px] text-xs font-bold text-white shadow-card transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="inline-block h-[13px] w-[13px] animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Refreshing…
              </>
            ) : (
              <>↻ Refresh</>
            )}
          </button>
        </div>
      </header>

      {/* ---------- error toast ---------- */}
      {error && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-[10px] border border-[#fecaca] bg-[#fee2e2] px-[14px] py-[10px] text-[12.5px] font-semibold text-[#b91c1c]">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="font-bold text-[#b91c1c]">
            ✕
          </button>
        </div>
      )}

      {/* ---------- search ---------- */}
      <div className="mb-4 flex items-center gap-[10px] rounded-[12px] border border-line bg-panel px-[14px] py-[11px] shadow-card">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-none text-muted"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.toLowerCase().trim())}
          type="text"
          placeholder="Search title, company, skill or location…"
          className="w-full border-0 bg-transparent text-[14.5px] text-ink outline-none"
        />
      </div>

      {/* ---------- layout ---------- */}
      <div className="grid grid-cols-1 items-start gap-[18px] md:grid-cols-[266px_1fr]">
        {/* sidebar */}
        <aside className="rounded-[14px] border border-line bg-panel p-4 shadow-card md:sticky md:top-[14px]">
          <FGroup first>
            <H3>Years of experience</H3>
            <div className="mt-[6px] text-[13px]">
              Showing fit for <span className="font-bold text-brand">{exp}</span> years
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={exp}
              onChange={(e) => setExp(Number(e.target.value))}
            />
            <div className="flex justify-between text-[10.5px] text-muted">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
            </div>
            <Toggle on={expFilter} onClick={() => setExpFilter((v) => !v)} className="mt-2">
              Hide roles needing ≫ my exp
            </Toggle>
          </FGroup>

          <FGroup>
            <H3>Seniority</H3>
            <Opts>
              {SEN_ORDER.map((s) => (
                <Opt key={s} on={sen.has(s)} onClick={() => toggle(setSen, s)}>
                  {s}
                </Opt>
              ))}
            </Opts>
          </FGroup>

          <FGroup>
            <H3>Backend &amp; languages</H3>
            <Opts>
              {topLang.map((s) => (
                <Opt key={s} on={lang.has(s)} onClick={() => toggle(setLang, s)}>
                  {s}
                </Opt>
              ))}
            </Opts>
          </FGroup>

          <FGroup>
            <H3>Infra &amp; platform</H3>
            <Opts>
              {topInfra.map((s) => (
                <Opt key={s} on={infra.has(s)} onClick={() => toggle(setInfra, s)}>
                  {s}
                </Opt>
              ))}
            </Opts>
          </FGroup>

          <FGroup>
            <Toggle on={ai} onClick={() => setAi((v) => !v)}>
              AI / ML-platform roles only
            </Toggle>
            <Toggle on={remote} onClick={() => setRemote((v) => !v)} className="mt-[11px]">
              Remote only
            </Toggle>
          </FGroup>

          <button
            onClick={reset}
            className="mt-[14px] w-full rounded-[9px] border border-line bg-chip px-2 py-[9px] text-[12.5px] font-semibold text-sslate hover:border-[#c7cfdb]"
          >
            Reset all filters
          </button>
        </aside>

        {/* main */}
        <main>
          <div className="mb-[13px] flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] text-muted">
              <b className="text-ink">{list.length}</b> of{" "}
              {view === "active" ? active.length : list.length} roles
            </div>
            <div className="flex gap-[6px] rounded-[10px] border border-line bg-panel p-1 shadow-card">
              <SortBtn on={sort === "match"} onClick={() => setSort("match")}>
                ★ Best match
              </SortBtn>
              <SortBtn on={sort === "new"} onClick={() => setSort("new")}>
                🕑 Newest
              </SortBtn>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-[14px]">
            {list.length === 0 ? (
              <div className="col-span-full px-5 py-[60px] text-center text-muted">
                <b className="mb-[6px] block text-[16px] text-ink">
                  {view === "applied"
                    ? "No jobs marked Applied yet"
                    : view === "notinterested"
                      ? "Nothing marked Not interested"
                      : jobs.length === 0
                        ? "No jobs loaded yet"
                        : "No roles match these filters"}
                </b>
                {view === "active"
                  ? jobs.length === 0
                    ? "Hit Refresh to pull the latest LinkedIn roles for India (last 24h)."
                    : "Try widening seniority, clearing skills, or moving the experience slider."
                  : "Use the ✓ Applied / 🚫 Not interested buttons on a card to file it here. Filed jobs stay hidden from Active even after the board refreshes."}
              </div>
            ) : (
              list.map((j) => (
                <JobCard
                  key={j.url}
                  j={j}
                  fit={isExpFit(j)}
                  exp={exp}
                  view={view}
                  status={status[j.url]}
                  onAct={setAct}
                />
              ))
            )}
          </div>

          <div className="mt-[30px] text-center text-[11.5px] leading-[1.6] text-muted">
            Data pulled live from LinkedIn via the Apify <i>valig/linkedin-jobs-scraper</i> actor
            (India, last 24 hours). Match scores &amp; experience parsing are heuristic estimates
            based on your profile — always read the full posting before applying.
          </div>
        </main>
      </div>
    </div>
  );
}

/* ----------------------- small presentational helpers ----------------------- */

function Pill({
  on = false,
  onClick,
  title,
  children,
}: {
  on?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-full border px-[13px] py-[7px] text-xs font-semibold shadow-card transition hover:border-[#c7cfdb] ${
        on ? "border-brand bg-brand text-white" : "border-line bg-panel"
      }`}
    >
      {children}
    </button>
  );
}

function Tab({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-[13px] py-[7px] text-xs font-semibold shadow-card ${
        on ? "border-brand bg-brand text-white" : "border-line bg-panel text-sslate"
      }`}
    >
      {children}
    </button>
  );
}
function TabNum({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={`ml-[2px] font-bold ${on ? "text-white/90" : "text-muted"}`}>{children}</span>;
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="m-0 mb-1 text-[11px] uppercase tracking-[0.06em] text-muted">{children}</h3>
  );
}
function FGroup({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className={`border-b border-line py-[13px] last:border-b-0 last:pb-0 ${first ? "pt-0" : ""}`}>
      {children}
    </div>
  );
}
function Opts({ children }: { children: React.ReactNode }) {
  return <div className="mt-[9px] flex flex-wrap gap-[7px]">{children}</div>;
}
function Opt({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`opt ${on ? "on" : ""}`} onClick={onClick}>
      {children}
    </div>
  );
}
function Toggle({
  on,
  onClick,
  children,
  className = "",
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`toggle flex cursor-pointer items-center justify-between gap-[10px] ${on ? "on" : ""} ${className}`}
      onClick={onClick}
    >
      <span className="text-[13px] font-semibold">{children}</span>
      <div className="switch" />
    </div>
  );
}
function SortBtn({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[7px] px-3 py-[6px] text-[12.5px] font-semibold ${
        on ? "bg-brand-soft text-brand" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------- job card -------------------------------- */

function JobCard({
  j,
  fit,
  exp,
  view,
  status,
  onAct,
}: {
  j: Job;
  fit: boolean;
  exp: number;
  view: View;
  status?: "applied" | "notinterested";
  onAct: (job: Job, val: "" | "applied" | "notinterested") => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-[14px] border bg-panel p-4 shadow-card transition hover:-translate-y-px hover:border-[#c7cfdb] hover:shadow-cardhover ${
        fit ? "border-brand ring-2 ring-brand-soft" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-[10px]">
        <div>
          <h2 className="m-0 text-[15.5px] font-bold leading-[1.25] tracking-[-0.01em]">{j.t}</h2>
          <p className="mt-1 text-[13px] font-semibold text-sslate">{j.c}</p>
        </div>
        <div className={`score ${scoreClass(j.score)} min-w-[54px] flex-none rounded-[11px] px-[9px] py-[7px] text-center`}>
          <b className="block text-[17px] font-extrabold leading-none">{j.score}</b>
          <small className="text-[9px] uppercase tracking-[0.05em] opacity-80">match</small>
        </div>
      </div>

      <div className="my-[11px] flex flex-wrap gap-[7px]">
        <span className="tag loc">📍 {j.loc}</span>
        <span className={`tag ${modeClass(j.mode)}`}>{j.mode}</span>
        <span className="tag sen">{j.sen}</span>
        <span className="tag exp">🧭 {j.expTxt}</span>
        {j.ai && <span className="tag ai">✨ AI / ML platform</span>}
        <span className="tag date">🕑 {j.when}</span>
      </div>

      <div className="mt-2">
        <div className="mb-[5px] text-[10px] font-bold uppercase tracking-[0.05em] text-muted">
          Backend &amp; languages
        </div>
        <div className="flex flex-wrap gap-[5px]">
          {j.lang.length ? (
            j.lang.map((s) => (
              <span key={s} className="chip lang">
                {s}
              </span>
            ))
          ) : (
            <span className="chip lang">—</span>
          )}
        </div>
      </div>

      <div className="mt-2">
        <div className="mb-[5px] text-[10px] font-bold uppercase tracking-[0.05em] text-muted">
          Infra &amp; platform
        </div>
        <div className="flex flex-wrap gap-[5px]">
          {j.infra.length ? (
            j.infra.map((s) => (
              <span key={s} className="chip infra">
                {s}
              </span>
            ))
          ) : (
            <span className="chip infra">—</span>
          )}
        </div>
      </div>

      <div className="reason mt-3" dangerouslySetInnerHTML={{ __html: j.reason }} />

      {fit && (
        <div className="mt-[9px] flex items-center gap-[5px] text-[11.5px] font-bold text-brand">
          ✓ Closely fits your ~{exp}-yr experience
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {view === "active" ? (
          <>
            <button
              onClick={() => onAct(j, "applied")}
              className="min-w-[118px] flex-1 rounded-[9px] border border-line bg-chip px-[10px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-sgreen hover:bg-sgreen-bg hover:text-sgreen"
            >
              ✓ Applied
            </button>
            <button
              onClick={() => onAct(j, "notinterested")}
              className="min-w-[118px] flex-1 rounded-[9px] border border-line bg-chip px-[10px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-[#dc2626] hover:bg-[#fee2e2] hover:text-[#dc2626]"
            >
              🚫 Not interested
            </button>
          </>
        ) : (
          <>
            <span
              className={`rounded-[7px] px-[11px] py-[5px] text-[11.5px] font-bold ${
                status === "applied" ? "bg-sgreen-bg text-sgreen" : "bg-[#fee2e2] text-[#dc2626]"
              }`}
            >
              {status === "applied" ? "✓ Applied" : "🚫 Not interested"}
            </span>
            <button
              onClick={() => onAct(j, "")}
              className="flex-none rounded-[9px] border border-line bg-chip px-[10px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-brand hover:bg-brand-soft hover:text-brand"
            >
              ↶ Move back to Active
            </button>
          </>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-[10px] pt-[13px]">
        <span className="text-[11px] text-muted">{j.app}</span>
        <a
          href={j.url}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap rounded-[9px] bg-brand px-[15px] py-[9px] text-[12.5px] font-bold text-white transition hover:bg-brand-dark"
        >
          View posting →
        </a>
      </div>
    </div>
  );
}
