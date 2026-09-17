"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import BoardShell from "@/components/board/BoardShell";
import TopNav from "@/components/board/TopNav";
import BoardHeader from "@/components/board/BoardHeader";
import FilterRail, { type FilterState } from "@/components/board/FilterRail";
import RoleList, { ResultsToolbar } from "@/components/board/RoleList";
import HighPaySettings from "@/components/HighPaySettings";
import NotificationBell from "@/components/NotificationBell";
import { Check } from "@/components/ui/Controls";
import { useTheme } from "@/lib/useOpenRolesChrome";
import type { JobStatus, RoleRow, SegmentOption } from "@/lib/openrolesUi";

/** A high-pay job; jobs restored from the shared filed-jobs archive may predate
 *  the radar tagging, so `hp` is optional on the board's working type. */
type BoardJob = Job & { hp?: HighPayJob["hp"] };

type View = "active" | "applied" | "saved" | "notinterested" | "closed";
type Sort = "band" | "match" | "new";
// "closed" = the posting was already gone when opened.
type FiledStatus = "applied" | "saved" | "notinterested" | "closed";
type Status = Record<string, FiledStatus>;

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

// The rail speaks in labels; the config speaks in tiers / sector keys.
const TIER_BY_LABEL = new Map(ALL_TIERS.map((t) => [TIER_LABEL[t], t]));
const CAT_BY_LABEL = new Map(ALL_CATS.map((c) => [CAT_LABEL[c], c]));
const BAND_OPTIONS = ALL_TIERS.map((t) => TIER_LABEL[t]);

function toUiStatus(v: FiledStatus | undefined): JobStatus {
  if (!v) return "active";
  return v === "notinterested" ? "hidden" : v;
}
function fromUiStatus(s: JobStatus): "" | FiledStatus {
  if (s === "active") return "";
  return s === "hidden" ? "notinterested" : s;
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

function plain(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export default function HighPayBoard({
  initialJobs,
  initialRefreshedAt,
}: {
  initialJobs: HighPayJob[];
  initialRefreshedAt: string | null;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { themeLabel, toggleTheme } = useTheme("dark");

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

  // Applied / Saved / Not-interested / Closed is shared with the normal board —
  // same /api/status store, so filing a job here files it everywhere.
  const [status, setStatus] = useState<Status>({});
  const [archive, setArchive] = useState<Record<string, BoardJob>>({});
  const [filedAt, setFiledAt] = useState<Record<string, number>>({});
  const [filedSort, setFiledSort] = useState<"recent" | "alpha">("recent");

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

  const skillOptions = useMemo(() => [...topLang, ...topInfra], [topLang, topInfra]);

  const sectorOptions = useMemo(() => {
    const present = new Set<HighPayCat>();
    jobs.forEach((j) => j.hp && present.add(j.hp.cat));
    const shown = ALL_CATS.filter((c) => present.has(c));
    return (shown.length ? shown : ALL_CATS).map((c) => CAT_LABEL[c]);
  }, [jobs]);

  function toggleSkill(value: string) {
    const setter = topLang.includes(value) ? setLang : setInfra;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
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
  const needle = q.trim().toLowerCase();

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
    if (needle && !searchHay(j).includes(needle)) return false;
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
        (j) => status[j.url] === view && (!needle || searchHay(j).includes(needle)),
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
  }, [jobs, archive, status, view, needle, tier, cat, sen, lang, infra, ai, remote, strong, exp, expFilter, sort, filedSort, filedAt]);

  const active = useMemo(() => jobs.filter((j) => !status[j.url]), [jobs, status]);

  const counts: Record<JobStatus, number> = {
    active: active.length,
    applied: Object.values(status).filter((v) => v === "applied").length,
    saved: Object.values(status).filter((v) => v === "saved").length,
    hidden: Object.values(status).filter((v) => v === "notinterested").length,
    closed: Object.values(status).filter((v) => v === "closed").length,
  };

  const activeFilterCount =
    tier.size +
    cat.size +
    sen.size +
    lang.size +
    infra.size +
    (ai ? 1 : 0) +
    (remote ? 1 : 0) +
    (strong ? 1 : 0) +
    (expFilter ? 1 : 0);

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

  /* ------------------------------- view model ------------------------------ */

  const rows: RoleRow[] = list.map((j) => ({
    id: j.url,
    match: j.score,
    title: j.t,
    company: j.hp && j.hp.n.toLowerCase() !== j.c.toLowerCase() ? `${j.c} · ${j.hp.n}` : j.c,
    ai: j.ai,
    pay: j.hp?.p,
    meta: [
      j.hp ? `${TIER_LABEL[j.hp.t]} · ${CAT_LABEL[j.hp.cat]}` : null,
      j.loc,
      j.mode,
      j.sen,
      j.expTxt,
      j.when,
    ]
      .filter(Boolean)
      .join("  ·  "),
    skills: [...j.lang, ...j.infra],
    fit: isExpFit(j)
      ? `${plain(j.reason)} · closely fits your ~${exp}-yr experience`
      : plain(j.reason),
    applicants: j.app,
    url: j.url,
    careersUrl: j.hp?.u,
    status: toUiStatus(status[j.url]),
  }));

  const byUrl = useMemo(() => {
    const m = new Map<string, BoardJob>();
    Object.values(archive).forEach((j) => m.set(j.url, j));
    jobs.forEach((j) => m.set(j.url, j));
    return m;
  }, [jobs, archive]);

  function onSetStatus(id: string, next: JobStatus) {
    const job = byUrl.get(id);
    if (job) setAct(job, fromUiStatus(next));
  }

  const filters: FilterState = {
    yoe: exp,
    hideAboveExp: expFilter,
    seniority: Array.from(sen),
    skills: [...Array.from(lang), ...Array.from(infra)],
    aiOnly: ai,
    remoteOnly: remote,
    bands: Array.from(tier).map((t) => TIER_LABEL[t]),
    sectors: Array.from(cat).map((c) => CAT_LABEL[c]),
  };

  function toggleIn<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function onFilterChange(patch: Partial<FilterState>) {
    if (patch.yoe !== undefined) setExp(patch.yoe);
    if (patch.hideAboveExp !== undefined) setExpFilter(patch.hideAboveExp);
    if (patch.aiOnly !== undefined) setAi(patch.aiOnly);
    if (patch.remoteOnly !== undefined) setRemote(patch.remoteOnly);
    if (patch.seniority) {
      const added = patch.seniority.find((s) => !sen.has(s));
      const removed = Array.from(sen).find((s) => !patch.seniority!.includes(s));
      toggleIn(setSen, (added ?? removed) as string);
    }
    if (patch.skills) {
      const current = new Set([...Array.from(lang), ...Array.from(infra)]);
      const added = patch.skills.find((s) => !current.has(s));
      const removed = Array.from(current).find((s) => !patch.skills!.includes(s));
      toggleSkill((added ?? removed) as string);
    }
    if (patch.bands) {
      const current = filters.bands;
      const changed = patch.bands.find((b) => !current.includes(b)) ??
        current.find((b) => !patch.bands!.includes(b));
      const t = changed ? TIER_BY_LABEL.get(changed) : undefined;
      if (t) toggleIn(setTier, t);
    }
    if (patch.sectors) {
      const current = filters.sectors;
      const changed = patch.sectors.find((c) => !current.includes(c)) ??
        current.find((c) => !patch.sectors!.includes(c));
      const c = changed ? CAT_BY_LABEL.get(changed) : undefined;
      if (c) toggleIn(setCat, c);
    }
  }

  const sortOptions: Array<SegmentOption<string>> =
    view === "active"
      ? [
          { value: "band", label: "Pay band" },
          { value: "match", label: "Best match" },
          { value: "new", label: "Newest" },
        ]
      : [
          { value: "recent", label: "Recent" },
          { value: "alpha", label: "A–Z" },
        ];

  const sortValue = view === "active" ? sort : filedSort;

  function onSortChange(next: string) {
    if (view === "active") setSort(next as Sort);
    else setFiledSort(next as "recent" | "alpha");
  }

  const sweep = progress
    ? ` · sweep ${progress.namesDone}/${progress.totalNames} companies scanned`
    : "";

  const meta =
    `LinkedIn roles from ${companyCount ?? 195} High Pay Radar companies · posted within ` +
    `${FRESHNESS_LABEL[config.freshness]} · ${config.locations.join(" / ")}${sweep} · ` +
    `refreshed ${fmtRefreshed(refreshedAt)}`;

  const emptyMessage =
    view === "applied"
      ? "No high-pay jobs marked Applied yet."
      : view === "saved"
        ? "No saved high-pay jobs yet."
        : view === "notinterested"
          ? "Nothing marked Not interested."
          : view === "closed"
            ? "Nothing marked Closed."
            : jobs.length === 0
              ? "No high-pay roles loaded yet — hit Scan to search the High Pay Radar companies on LinkedIn. Each search takes a minute or two; results land as they finish."
              : undefined;

  return (
    <BoardShell
      nav={
        <TopNav
          page="high"
          onNavigate={(p) => p === "board" && router.push("/")}
          userName={session?.user?.name ?? session?.user?.email ?? undefined}
          avatarUrl={session?.user?.image}
          alertsSlot={session?.user ? <NotificationBell /> : undefined}
          profileHref="/profile"
          onOpenSettings={() => setShowSettings(true)}
          themeLabel={themeLabel}
          onToggleTheme={toggleTheme}
        />
      }
      header={
        <BoardHeader
          title="Only the companies that pay."
          tag="HIGH PAY"
          meta={meta}
          refreshLabel="Scan"
          onRefresh={scan}
          refreshing={loading}
          query={q}
          onQueryChange={setQ}
          status={view === "active" ? "active" : toUiStatus(view)}
          onStatusChange={(s) => {
            const next = fromUiStatus(s);
            setView(next === "" ? "active" : next);
          }}
          counts={counts}
        />
      }
      rail={
        <FilterRail
          isHighPay
          filters={filters}
          onChange={onFilterChange}
          onReset={reset}
          activeCount={activeFilterCount}
          skillOptions={skillOptions}
          sectorOptions={sectorOptions}
          bandOptions={BAND_OPTIONS}
          extraToggles={
            <Check checked={strong} onChange={setStrong}>
              Strong matches only (80+)
            </Check>
          }
        />
      }
      overlays={
        showSettings && (
          <HighPaySettings
            initial={config}
            onClose={() => setShowSettings(false)}
            onSaved={(next, companies, doScan) => {
              setConfig(next);
              setCompanyCount(companies);
              setShowSettings(false);
              if (doScan) void scan();
            }}
          />
        )
      }
    >
      {error && (
        <div className="or-toolbar" role="status">
          <div className="or-toolbar__count">⚠️ {error}</div>
          <button type="button" className="or-btn--link" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {(note || loading) && (
        <div className="or-toolbar" role="status">
          <div className="or-toolbar__count">
            {loading && pending > 0 ? `Scanning · ${pending} running — ` : ""}
            {note ?? "Starting the scan…"}
          </div>
          {loading ? (
            <button type="button" className="or-btn--link" onClick={stopScan}>
              Stop after the running searches
            </button>
          ) : (
            <button type="button" className="or-btn--link" onClick={() => setNote(null)}>
              Dismiss
            </button>
          )}
        </div>
      )}

      <ResultsToolbar
        shown={rows.length}
        total={view === "active" ? active.length : rows.length}
        companies={new Set(list.map((j) => j.hp?.n ?? j.c)).size}
        filterSummary={
          activeFilterCount
            ? `${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active`
            : "no filters"
        }
        sortOptions={sortOptions}
        sort={sortValue}
        onSortChange={onSortChange}
      />

      <RoleList
        roles={rows}
        onSetStatus={onSetStatus}
        onResetFilters={reset}
        emptyMessage={emptyMessage}
      />

      <div
        style={{
          marginTop: 22,
          textAlign: "center",
          fontSize: 11.5,
          lineHeight: 1.6,
          color: "var(--muted)",
        }}
      >
        Company shortlist from{" "}
        <a href="https://github.com/fiercearyan/HighPayRadar" target="_blank" rel="noreferrer">
          High Pay Radar
        </a>{" "}
        · jobs pulled live from LinkedIn via the Apify <i>valig/linkedin-jobs-scraper</i> actor. Pay
        bands are the radar&apos;s market estimates for a 3–5 yr backend engineer, not the
        posting&apos;s stated salary — always confirm with the recruiter.
      </div>
    </BoardShell>
  );
}
