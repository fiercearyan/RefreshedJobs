"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Job } from "@/lib/types";
import type { HighPayJob, HighPayProgress, HighPayScanResponse } from "@/lib/highPayTypes";
import {
  ALL_CATS,
  ALL_TIERS,
  CAT_LABEL,
  TIER_LABEL,
  type HighPayCat,
  type HighPayTier,
} from "@/lib/highPayCompanies";
import { DEFAULT_HIGH_PAY_CONFIG, type HighPayConfig } from "@/lib/highPayConfig";
import { FRESHNESS_LABEL } from "@/lib/searchConfig";
import HighPaySettings from "@/components/HighPaySettings";

/** A high-pay job; jobs restored from the shared filed-jobs archive may predate
 *  the radar tagging, so `hp` is optional on the board's working type. */
type BoardJob = Job & { hp?: HighPayJob["hp"] };

type View = "active" | "applied" | "saved" | "notinterested" | "closed";
type Sort = "band" | "match" | "new";
// "closed" = the posting was already gone when opened.
type FiledStatus = "applied" | "saved" | "notinterested" | "closed";
type Status = Record<string, FiledStatus>;

const SEN_ORDER: Job["sen"][] = ["Entry", "Mid", "Senior", "Staff"];
// Sidebar filter chips — only the languages on Aryan's resume.
const LANG_PREF = ["Java", "Spring Boot", "Go", "Scala"];
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

export default function HighPayBoard({
  initialJobs,
  initialRefreshedAt,
}: {
  initialJobs: HighPayJob[];
  initialRefreshedAt: string | null;
}) {
  const [jobs, setJobs] = useState<BoardJob[]>(initialJobs);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(initialRefreshedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [config, setConfig] = useState<HighPayConfig>(DEFAULT_HIGH_PAY_CONFIG);
  const [companyCount, setCompanyCount] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Scan state — Apify runs are started, then polled until they finish.
  const [pending, setPending] = useState(0);
  const [progress, setProgress] = useState<HighPayProgress | null>(null);
  const stopRef = useRef(false);

  // filter / sort / view state
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<Set<HighPayTier>>(new Set());
  const [cat, setCat] = useState<Set<HighPayCat>>(new Set());
  const [sen, setSen] = useState<Set<string>>(new Set());
  const [lang, setLang] = useState<Set<string>>(new Set());
  const [infra, setInfra] = useState<Set<string>>(new Set());
  const [ai, setAi] = useState(false);
  const [remote, setRemote] = useState(false);
  const [strong, setStrong] = useState(false);
  const [exp, setExp] = useState(CANDIDATE_EXP);
  const [expFilter, setExpFilter] = useState(false);
  const [sort, setSort] = useState<Sort>("band");
  const [view, setView] = useState<View>("active");

  // Applied / Saved / Not-interested is shared with the normal OpenRoles board —
  // same /api/status store, so filing a job here files it everywhere.
  const [status, setStatus] = useState<Status>({});
  const [archive, setArchive] = useState<Record<string, BoardJob>>({});
  const [filedAt, setFiledAt] = useState<Record<string, number>>({});
  const [filedSort, setFiledSort] = useState<"recent" | "alpha">("recent");

  useEffect(() => {
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setStatus(data.status || {});
          setArchive(data.archive || {});
          setFiledAt(data.at || {});
        }
      })
      .catch(() => {
        /* ignore — board still works */
      });
    fetch("/api/highpay-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.config) setConfig(data.config);
        if (typeof data?.companies === "number") setCompanyCount(data.companies);
      })
      .catch(() => {
        /* ignore — defaults shown */
      });
    // A scan started on another device (or before a reload) may still be running.
    fetch("/api/highpay-refresh")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: HighPayScanResponse | null) => {
        if (!data) return;
        apply(data);
        if (data.pending > 0) void resume();
      })
      .catch(() => {
        /* ignore */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setAct(job: BoardJob, val: "" | FiledStatus) {
    setStatus((prev) => {
      const next = { ...prev };
      if (val) next[job.url] = val;
      else delete next[job.url];
      return next;
    });
    setArchive((prev) => {
      const next = { ...prev };
      if (val) next[job.url] = job;
      else delete next[job.url];
      return next;
    });
    setFiledAt((prev) => {
      const next = { ...prev };
      if (val) next[job.url] = Date.now();
      else delete next[job.url];
      return next;
    });
    if (!val) {
      setJobs((prev) => (prev.some((x) => x.url === job.url) ? prev : [job, ...prev]));
    }
    fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: job.url, status: val, job }),
    }).catch(() => {
      /* local state already updated */
    });
  }

  const apply = useCallback((data: HighPayScanResponse) => {
    // Never let an empty reply wipe a board we've already filled this session.
    if (Array.isArray(data.jobs)) setJobs((prev) => (data.jobs.length ? data.jobs : prev));
    if (data.refreshedAt) setRefreshedAt(data.refreshedAt);
    if (data.config) setConfig(data.config);
    if (data.progress) {
      setProgress(data.progress);
      setCompanyCount(data.progress.companies);
    }
    setPending(data.pending ?? 0);
  }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** Poll until every in-flight run has been collected. Returns the last reply. */
  const pollUntilIdle = useCallback(async (): Promise<HighPayScanResponse | null> => {
    let last: HighPayScanResponse | null = null;
    for (let i = 0; i < 60; i++) {
      if (stopRef.current) break;
      await sleep(i === 0 ? 6000 : 8000);
      if (stopRef.current) break;
      const res = await fetch("/api/highpay-refresh");
      const data = (await res.json()) as HighPayScanResponse;
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      apply(data);
      last = data;
      if (data.added || data.matched) {
        setNote(
          `+${data.added ?? 0} new · ${data.jobs?.length ?? 0} roles on the board · ` +
            `${data.progress.namesDone}/${data.progress.totalNames} companies scanned`,
        );
      }
      if (!data.pending) break;
    }
    return last;
  }, [apply]);

  /** Re-attach to a scan that was already running when the page loaded. */
  const resume = useCallback(async () => {
    setLoading(true);
    try {
      await pollUntilIdle();
    } catch {
      /* leave the board as-is */
    } finally {
      setLoading(false);
    }
  }, [pollUntilIdle]);

  function stopScan() {
    stopRef.current = true;
  }

  /**
   * Start the scan and keep it going: the LinkedIn actor needs minutes per
   * search, so we launch a wave of Apify runs, poll until they land, then
   * launch the next wave — until the whole company list is swept, the run
   * budget for this press is used up, or you press Stop.
   */
  async function scan() {
    if (loading) return;
    stopRef.current = false;
    setLoading(true);
    setError(null);
    setNote(null);
    let runsStarted = 0;
    try {
      for (;;) {
        const res = await fetch("/api/highpay-refresh", { method: "POST" });
        const data = (await res.json()) as HighPayScanResponse;
        if (!res.ok && !data.jobs) throw new Error(data.error || `Request failed (${res.status})`);
        apply(data);
        if (data.error) setError(data.error);
        runsStarted += data.started ?? 0;

        if (!data.pending) break; // nothing running and nothing could be started

        setNote(
          `Scanning ${data.progress.totalNames} companies — ${data.pending} LinkedIn ` +
            `${data.pending === 1 ? "search" : "searches"} running. Results land as they finish; ` +
            `you can leave this page.`,
        );

        const last = await pollUntilIdle();
        if (stopRef.current) break;
        if (last?.sweepComplete) {
          setNote(
            `Swept all ${last.progress.totalNames} companies · ${last.jobs?.length ?? 0} roles on the board.`,
          );
          break;
        }
        if (runsStarted >= config.maxBatches) {
          setNote(
            `Paused after ${runsStarted} searches (your per-scan budget) · ` +
              `${last?.progress.namesDone ?? 0}/${last?.progress.totalNames ?? 0} companies covered · ` +
              `press Scan again to continue where this left off.`,
          );
          break;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      stopRef.current = false;
      setLoading(false);
    }
  }

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

  const catsPresent = useMemo(() => {
    const present = new Set<HighPayCat>();
    jobs.forEach((j) => j.hp && present.add(j.hp.cat));
    return ALL_CATS.filter((c) => present.has(c));
  }, [jobs]);

  function toggle<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, val: T) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  function expBonus(j: BoardJob) {
    if (j.exp == null) return 4;
    return Math.max(0, 12 - 3 * Math.abs(j.exp - exp));
  }
  function isExpFit(j: BoardJob) {
    return j.exp != null && Math.abs(j.exp - exp) <= 1.5;
  }
  function searchHay(j: BoardJob) {
    return `${j.t} ${j.c} ${j.loc} ${j.sen} ${j.lang.join(" ")} ${j.infra.join(" ")}`.toLowerCase();
  }
  function passes(j: BoardJob) {
    if (tier.size && !(j.hp && tier.has(j.hp.t))) return false;
    if (cat.size && !(j.hp && cat.has(j.hp.cat))) return false;
    if (ai && !j.ai) return false;
    if (remote && j.mode !== "Remote") return false;
    if (strong && j.score < 80) return false;
    if (sen.size && !sen.has(j.sen)) return false;
    if (lang.size && !j.lang.some((s) => lang.has(s))) return false;
    if (infra.size && !j.infra.some((s) => infra.has(s))) return false;
    if (expFilter && j.exp != null && j.exp > exp) return false;
    if (q && !searchHay(j).includes(q)) return false;
    return true;
  }

  const list = useMemo(() => {
    let l: BoardJob[];
    if (view === "active") {
      l = jobs.filter((j) => !status[j.url] && passes(j));
    } else {
      // Filed tabs on this board show only jobs from high-pay companies, so the
      // shared archive is narrowed to entries that carry radar metadata (or are
      // still present in the current high-pay pull).
      const inPull = new Set(jobs.map((j) => j.url));
      const byUrl = new Map<string, BoardJob>();
      Object.values(archive).forEach((j) => {
        if (j.hp || inPull.has(j.url)) byUrl.set(j.url, j);
      });
      jobs.forEach((j) => byUrl.set(j.url, j));
      l = Array.from(byUrl.values()).filter(
        (j) => status[j.url] === view && (!q || searchHay(j).includes(q)),
      );
    }
    if (view !== "active") {
      if (filedSort === "alpha") l = [...l].sort((a, b) => a.t.localeCompare(b.t));
      else l = [...l].sort((a, b) => (filedAt[b.url] ?? 0) - (filedAt[a.url] ?? 0));
    } else if (sort === "new") {
      l = [...l].sort((a, b) => b.iso.localeCompare(a.iso) || b.score - a.score);
    } else if (sort === "band") {
      l = [...l].sort(
        (a, b) => (b.hp?.t ?? 0) - (a.hp?.t ?? 0) || b.score + expBonus(b) - (a.score + expBonus(a)),
      );
    } else {
      l = [...l].sort((a, b) => b.score + expBonus(b) - (a.score + expBonus(a)));
    }
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, archive, status, view, q, tier, cat, sen, lang, infra, ai, remote, strong, exp, expFilter, sort, filedSort, filedAt]);

  const active = useMemo(() => jobs.filter((j) => !status[j.url]), [jobs, status]);
  const counts = {
    total: active.length,
    top: active.filter((j) => j.hp?.t === 3).length,
    strong: active.filter((j) => j.score >= 80).length,
    remote: active.filter((j) => j.mode === "Remote").length,
    companies: new Set(active.map((j) => j.hp?.n ?? j.c)).size,
    applied: Object.values(status).filter((v) => v === "applied").length,
    saved: Object.values(status).filter((v) => v === "saved").length,
    not: Object.values(status).filter((v) => v === "notinterested").length,
    closed: Object.values(status).filter((v) => v === "closed").length,
  };

  function reset() {
    setQ("");
    setTier(new Set());
    setCat(new Set());
    setSen(new Set());
    setLang(new Set());
    setInfra(new Set());
    setAi(false);
    setRemote(false);
    setStrong(false);
    setExp(CANDIDATE_EXP);
    setExpFilter(false);
    setSort("band");
  }

  return (
    <div className="mx-auto max-w-[1280px] px-[18px] pb-[60px] pt-5">
      {/* ---------- header ---------- */}
      <header className="mb-[18px] flex flex-wrap items-center justify-between gap-[14px]">
        <div>
          <div className="mb-[3px] flex items-center gap-2">
            <span className="rounded-full bg-brand-soft px-[9px] py-[3px] text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-brand">
              💰 High Pay
            </span>
            <Link href="/" className="text-[11.5px] font-semibold text-muted hover:text-brand">
              ← all roles
            </Link>
          </div>
          <h1 className="m-0 text-[21px] font-bold tracking-[-0.01em]">
            Only the companies that pay.
          </h1>
          <p className="mt-[3px] text-[12.5px] text-muted">
            LinkedIn roles from the{" "}
            <b className="text-ink">{companyCount ?? "195"} High Pay Radar companies</b>, posted in
            the last {FRESHNESS_LABEL[config.freshness]} · {config.locations.join(" / ")} · refreshed{" "}
            {fmtRefreshed(refreshedAt)}
            <br />
            <span className="text-[11.5px]">
              {progress && progress.totalUnits > 0 ? (
                <>
                  Sweep progress: <b className="text-ink">{progress.namesDone}</b>/
                  {progress.totalNames} companies scanned
                  {progress.swept >= progress.totalUnits
                    ? " — full list covered; the next scan starts a new sweep."
                    : " — Scan picks up where it left off."}
                </>
              ) : (
                <>
                  Each scan works through the company list in waves and adds what it finds to the
                  board.
                </>
              )}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill onClick={reset} title="Show every high-pay role">
            💼 <b className="text-brand">{counts.total}</b> roles
          </Pill>
          <Pill
            on={tier.has(3)}
            onClick={() => {
              setView("active");
              toggle(setTier, 3 as HighPayTier);
            }}
            title="Only ₹50L+ band companies"
          >
            🏆 <b className={tier.has(3) ? "text-white" : "text-brand"}>{counts.top}</b> ₹50L+
          </Pill>
          <Pill
            on={strong}
            onClick={() => {
              setView("active");
              setStrong((v) => !v);
            }}
            title="Filter to strong matches (score ≥ 80)"
          >
            🎯 <b className={strong ? "text-white" : "text-brand"}>{counts.strong}</b> strong
          </Pill>
          <div className="ml-1 flex gap-[6px]">
            <Tab on={view === "active"} onClick={() => setView("active")}>
              Active<TabNum on={view === "active"}>{counts.total}</TabNum>
            </Tab>
            <Tab on={view === "applied"} onClick={() => setView("applied")}>
              ✓ Applied<TabNum on={view === "applied"}>{counts.applied}</TabNum>
            </Tab>
            <Tab on={view === "saved"} onClick={() => setView("saved")}>
              🔖 Saved<TabNum on={view === "saved"}>{counts.saved}</TabNum>
            </Tab>
            <Tab on={view === "notinterested"} onClick={() => setView("notinterested")}>
              🚫 Not interested<TabNum on={view === "notinterested"}>{counts.not}</TabNum>
            </Tab>
            <Tab on={view === "closed"} onClick={() => setView("closed")}>
              🔒 Closed<TabNum on={view === "closed"}>{counts.closed}</TabNum>
            </Tab>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            title="High Pay search settings (companies, roles, freshness)"
            className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-[12px] py-[7px] text-xs font-semibold shadow-card transition hover:border-brand"
          >
            ⚙︎ Settings
          </button>
          {loading ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand px-[15px] py-[8px] text-xs font-bold text-white shadow-card">
                <span className="inline-block h-[13px] w-[13px] animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Scanning{pending > 0 ? ` · ${pending} running` : "…"}
              </span>
              <button
                onClick={stopScan}
                title="Stop after the searches that are already running"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-[12px] py-[7px] text-xs font-semibold shadow-card transition hover:border-red-ink hover:text-red-ink"
              >
                ■ Stop
              </button>
            </>
          ) : (
            <button
              onClick={scan}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-[15px] py-[8px] text-xs font-bold text-white shadow-card transition hover:bg-brand-dark"
            >
              ↻ Scan
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-[10px] border border-line bg-red-soft px-[14px] py-[10px] text-[12.5px] font-semibold text-red-ink">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="font-bold text-red-ink">
            ✕
          </button>
        </div>
      )}
      {note && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-[10px] border border-line bg-panel-2 px-[14px] py-[9px] text-[12px] text-muted">
          <span>ℹ️ {note}</span>
          <button onClick={() => setNote(null)} className="font-bold text-muted">
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
          placeholder="Search company, title, skill or location…"
          className="w-full border-0 bg-transparent text-[14.5px] text-ink outline-none"
        />
      </div>

      {/* ---------- layout ---------- */}
      <div className="grid grid-cols-1 items-start gap-[18px] md:grid-cols-[266px_1fr]">
        <aside className="rounded-[14px] border border-line bg-panel p-4 shadow-card md:sticky md:top-[14px]">
          <FGroup first>
            <H3>Pay band</H3>
            <Opts>
              {ALL_TIERS.map((t) => (
                <Opt key={t} on={tier.has(t)} onClick={() => toggle(setTier, t)}>
                  {TIER_LABEL[t]}
                </Opt>
              ))}
            </Opts>
          </FGroup>

          {catsPresent.length > 0 && (
            <FGroup>
              <H3>Sector</H3>
              <Opts>
                {catsPresent.map((c) => (
                  <Opt key={c} on={cat.has(c)} onClick={() => toggle(setCat, c)}>
                    {CAT_LABEL[c]}
                  </Opt>
                ))}
              </Opts>
            </FGroup>
          )}

          <FGroup>
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
              Hide roles needing &gt; my exp
            </Toggle>
          </FGroup>

          <FGroup>
            <H3>Seniority</H3>
            <Opts>
              {SEN_ORDER.map((s) => (
                <Opt key={s} on={sen.has(s)} onClick={() => toggle<string>(setSen, s)}>
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
            className="mt-[14px] w-full rounded-[9px] border border-line bg-chip px-2 py-[9px] text-[12.5px] font-semibold text-sslate hover:border-brand"
          >
            Reset all filters
          </button>
        </aside>

        <main>
          <div className="mb-[13px] flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] text-muted">
              <b className="text-ink">{list.length}</b> of{" "}
              {view === "active" ? active.length : list.length} roles
              {view === "active" && counts.companies > 0 && (
                <> · {counts.companies} companies hiring</>
              )}
            </div>
            <div className="flex gap-[6px] rounded-[10px] border border-line bg-panel p-1 shadow-card">
              {view === "active" ? (
                <>
                  <SortBtn on={sort === "band"} onClick={() => setSort("band")}>
                    💰 Pay band
                  </SortBtn>
                  <SortBtn on={sort === "match"} onClick={() => setSort("match")}>
                    ★ Best match
                  </SortBtn>
                  <SortBtn on={sort === "new"} onClick={() => setSort("new")}>
                    🕑 Newest
                  </SortBtn>
                </>
              ) : (
                <>
                  <SortBtn on={filedSort === "recent"} onClick={() => setFiledSort("recent")}>
                    🕑 Recent
                  </SortBtn>
                  <SortBtn on={filedSort === "alpha"} onClick={() => setFiledSort("alpha")}>
                    🔤 A–Z
                  </SortBtn>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-[14px]">
            {list.length === 0 ? (
              <div className="col-span-full px-5 py-[60px] text-center text-muted">
                <b className="mb-[6px] block text-[16px] text-ink">
                  {view === "applied"
                    ? "No high-pay jobs marked Applied yet"
                    : view === "saved"
                      ? "No saved high-pay jobs yet"
                      : view === "notinterested"
                        ? "Nothing marked Not interested"
                        : view === "closed"
                          ? "Nothing marked Closed"
                          : jobs.length === 0
                          ? "No high-pay roles loaded yet"
                          : "No roles match these filters"}
                </b>
                {view === "active"
                  ? jobs.length === 0
                    ? "Hit Scan to search the High Pay Radar companies on LinkedIn. Each search takes a minute or two — results land as they finish."
                    : "Try widening the pay band, clearing sectors, or stretching the freshness window in Settings — top companies post less often."
                  : "Applied / Saved / Not interested are shared with the main OpenRoles board."}
              </div>
            ) : (
              list.map((j) => (
                <HighPayCard
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
            Company shortlist from{" "}
            <a
              href="https://github.com/fiercearyan/HighPayRadar"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand"
            >
              High Pay Radar
            </a>{" "}
            · jobs pulled live from LinkedIn via the Apify <i>valig/linkedin-jobs-scraper</i> actor.
            Pay bands are the radar&apos;s market estimates for a 3–5 yr backend engineer, not the
            posting&apos;s stated salary — always confirm with the recruiter.
          </div>
        </main>
      </div>

      {showSettings && (
        <HighPaySettings
          initial={config}
          onClose={() => setShowSettings(false)}
          onSaved={(next, companies, doRefresh) => {
            setConfig(next);
            setCompanyCount(companies);
            setShowSettings(false);
            if (doRefresh) void scan();
          }}
        />
      )}
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
      className={`rounded-full border px-[13px] py-[7px] text-xs font-semibold shadow-card transition hover:border-brand ${
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
  return (
    <span className={`ml-[2px] font-bold ${on ? "text-white/90" : "text-muted"}`}>{children}</span>
  );
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="m-0 mb-1 text-[11px] uppercase tracking-[0.06em] text-muted">{children}</h3>;
}
function FGroup({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div
      className={`border-b border-line py-[13px] last:border-b-0 last:pb-0 ${first ? "pt-0" : ""}`}
    >
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

function HighPayCard({
  j,
  fit,
  exp,
  view,
  status,
  onAct,
}: {
  j: BoardJob;
  fit: boolean;
  exp: number;
  view: View;
  status?: FiledStatus;
  onAct: (job: BoardJob, val: "" | FiledStatus) => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-[14px] border bg-panel p-4 shadow-card transition hover:-translate-y-px hover:border-brand hover:shadow-cardhover ${
        fit ? "border-brand ring-2 ring-brand-soft" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-[10px]">
        <div>
          <h2 className="m-0 text-[15.5px] font-bold leading-[1.25] tracking-[-0.01em]">{j.t}</h2>
          <p className="mt-1 text-[13px] font-semibold text-sslate">
            {j.c}
            {j.hp && j.hp.n.toLowerCase() !== j.c.toLowerCase() && (
              <span className="font-normal text-muted"> · {j.hp.n}</span>
            )}
          </p>
        </div>
        <div
          className={`score ${scoreClass(j.score)} min-w-[54px] flex-none rounded-[11px] px-[9px] py-[7px] text-center`}
        >
          <b className="block text-[17px] font-extrabold leading-none">{j.score}</b>
          <small className="text-[9px] uppercase tracking-[0.05em] opacity-80">match</small>
        </div>
      </div>

      {j.hp && (
        <div className="mt-[10px] flex flex-wrap items-center gap-[7px] rounded-[10px] border border-line bg-panel-2 px-[10px] py-[7px]">
          <span className="text-[13px] font-extrabold text-brand">{j.hp.p}</span>
          <span className="text-[11px] font-semibold text-muted">
            {TIER_LABEL[j.hp.t]} band · {CAT_LABEL[j.hp.cat]}
          </span>
          <a
            href={j.hp.u}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[11px] font-bold text-muted hover:text-brand"
            title="Company careers page"
          >
            careers ↗
          </a>
        </div>
      )}

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
              className="min-w-[92px] flex-1 rounded-[9px] border border-line bg-chip px-[8px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-sgreen hover:bg-sgreen-bg hover:text-sgreen"
            >
              ✓ Applied
            </button>
            <button
              onClick={() => onAct(j, "saved")}
              className="min-w-[92px] flex-1 rounded-[9px] border border-line bg-chip px-[8px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-sblue hover:bg-sblue-bg hover:text-sblue"
            >
              🔖 Save
            </button>
            <button
              onClick={() => onAct(j, "notinterested")}
              className="min-w-[92px] flex-1 rounded-[9px] border border-line bg-chip px-[8px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-red-ink hover:bg-red-soft hover:text-red-ink"
            >
              🚫 Not interested
            </button>
            <button
              onClick={() => onAct(j, "closed")}
              title="Posting is gone or no longer accepting applications"
              className="min-w-[92px] flex-1 rounded-[9px] border border-line bg-chip px-[8px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-samber hover:bg-samber-bg hover:text-samber"
            >
              🔒 Closed
            </button>
          </>
        ) : (
          <>
            <span
              className={`rounded-[7px] px-[11px] py-[5px] text-[11.5px] font-bold ${
                status === "applied"
                  ? "bg-sgreen-bg text-sgreen"
                  : status === "saved"
                    ? "bg-sblue-bg text-sblue"
                    : status === "closed"
                      ? "bg-samber-bg text-samber"
                      : "bg-red-soft text-red-ink"
              }`}
            >
              {status === "applied"
                ? "✓ Applied"
                : status === "saved"
                  ? "🔖 Saved"
                  : status === "closed"
                    ? "🔒 Closed"
                    : "🚫 Not interested"}
            </span>
            {status === "saved" && (
              <button
                onClick={() => onAct(j, "applied")}
                className="flex-none rounded-[9px] border border-line bg-chip px-[10px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-sgreen hover:bg-sgreen-bg hover:text-sgreen"
              >
                ✓ Applied
              </button>
            )}
            <button
              onClick={() => onAct(j, "")}
              className="flex-none rounded-[9px] border border-line bg-chip px-[10px] py-[9px] text-[12.5px] font-bold text-sslate transition hover:border-brand hover:bg-brand-soft hover:text-brand"
            >
              {status === "saved" ? "↶ Unsave" : "↶ Move back to Active"}
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
