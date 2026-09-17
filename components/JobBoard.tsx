"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Job, RefreshResponse } from "@/lib/types";
import { DEFAULT_CONFIG, FRESHNESS_LABEL, type SearchConfig } from "@/lib/searchConfig";
import BoardShell from "@/components/board/BoardShell";
import TopNav from "@/components/board/TopNav";
import BoardHeader from "@/components/board/BoardHeader";
import FilterRail, { type FilterState } from "@/components/board/FilterRail";
import RoleList, { ResultsToolbar } from "@/components/board/RoleList";
import SearchSettingsModal, { type SearchConfig as ModalConfig } from "@/components/settings/SearchSettingsModal";
import NotificationBell from "@/components/NotificationBell";
import { Check } from "@/components/ui/Controls";
import { useTheme } from "@/lib/useOpenRolesChrome";
import type { JobStatus, RoleRow, SegmentOption } from "@/lib/openrolesUi";

type View = "active" | "applied" | "saved" | "notinterested" | "closed";
type Sort = "match" | "new";
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

/** UI bucket names differ from the stored ones by exactly one label. */
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

/** The match reason carries <b> tags for the old card; the row renders text. */
function plain(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export default function JobBoard({
  initialJobs,
  initialRefreshedAt,
}: {
  initialJobs: Job[];
  initialRefreshedAt: string | null;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { themeLabel, toggleTheme } = useTheme("dark");

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(initialRefreshedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<SearchConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState<ModalConfig | null>(null);
  const [saving, setSaving] = useState(false);

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

  // applied / saved / not-interested / closed, persisted by stable job URL
  const [status, setStatus] = useState<Status>({});
  const [archive, setArchive] = useState<Record<string, Job>>({});
  const [filedAt, setFiledAt] = useState<Record<string, number>>({});
  const [filedSort, setFiledSort] = useState<"recent" | "alpha">("recent");

  // On mount: load Applied/Saved/Not-interested/Closed from the user's account
  // (synced across devices via MongoDB). The jobs snapshot itself is
  // server-rendered from MongoDB via initialJobs.
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
        /* ignore — board still works, just no saved statuses */
      });
    fetch("/api/search-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.config) setConfig(data.config);
      })
      .catch(() => {
        /* ignore — fall back to default config display */
      });
  }, []);

  function setAct(job: Job, val: "" | FiledStatus) {
    // Optimistic local update…
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
    // Un-filing: make sure the job is in the visible pool so it shows in Active —
    // it may not be in the latest pull (e.g. older than the freshness window).
    if (!val) {
      setJobs((prev) => (prev.some((x) => x.url === job.url) ? prev : [job, ...prev]));
    }
    // …then persist to the account (synced across devices).
    fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: job.url, status: val, job }),
    }).catch(() => {
      /* ignore network errors; local state already updated */
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
        if (data.config) setConfig(data.config);
        // The server already saved this snapshot to the user's account (MongoDB),
        // so every device picks it up on next load — no per-device cache needed.
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

  /** The rail shows one SKILLS list; a click still routes to language or infra. */
  const skillOptions = useMemo(() => [...topLang, ...topInfra], [topLang, topInfra]);

  function toggleSkill(value: string) {
    const setter = topLang.includes(value) ? setLang : setInfra;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function toggleSeniority(value: string) {
    setSen((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
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
  const needle = q.trim().toLowerCase();

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
    if (expFilter && j.exp != null && j.exp > exp) return false;
    if (needle && !searchHay(j).includes(needle)) return false;
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
        (j) => status[j.url] === view && (!needle || searchHay(j).includes(needle)),
      );
    }
    if (view !== "active") {
      // Filed tabs: Recent (most recently filed first) or A–Z by title.
      if (filedSort === "alpha") {
        l = [...l].sort((a, b) => a.t.localeCompare(b.t));
      } else {
        l = [...l].sort((a, b) => (filedAt[b.url] ?? 0) - (filedAt[a.url] ?? 0));
      }
    } else if (sort === "new") {
      l = [...l].sort((a, b) => b.iso.localeCompare(a.iso) || b.score - a.score);
    } else {
      l = [...l].sort((a, b) => b.score + expBonus(b) - (a.score + expBonus(a)));
    }
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, archive, status, view, needle, sen, lang, infra, ai, remote, strong, exp, expFilter, sort, filedSort, filedAt]);

  const active = useMemo(() => jobs.filter((j) => !status[j.url]), [jobs, status]);

  const counts: Record<JobStatus, number> = {
    active: active.length,
    applied: Object.values(status).filter((v) => v === "applied").length,
    saved: Object.values(status).filter((v) => v === "saved").length,
    hidden: Object.values(status).filter((v) => v === "notinterested").length,
    closed: Object.values(status).filter((v) => v === "closed").length,
  };

  const activeFilterCount =
    sen.size +
    lang.size +
    infra.size +
    (ai ? 1 : 0) +
    (remote ? 1 : 0) +
    (strong ? 1 : 0) +
    (expFilter ? 1 : 0);

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

  /* ------------------------------- view model ------------------------------ */

  const rows: RoleRow[] = list.map((j) => ({
    id: j.url,
    match: j.score,
    title: j.t,
    company: j.c,
    ai: j.ai,
    pay: j.expTxt,
    meta: [j.loc, j.mode, j.sen, `${j.when}`].filter(Boolean).join("  ·  "),
    skills: [...j.lang, ...j.infra],
    fit: isExpFit(j)
      ? `${plain(j.reason)} · closely fits your ~${exp}-yr experience`
      : plain(j.reason),
    applicants: j.app,
    url: j.url,
    status: toUiStatus(status[j.url]),
  }));

  const byUrl = useMemo(() => {
    const m = new Map<string, Job>();
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
    bands: [],
    sectors: [],
  };

  function onFilterChange(patch: Partial<FilterState>) {
    if (patch.yoe !== undefined) setExp(patch.yoe);
    if (patch.hideAboveExp !== undefined) setExpFilter(patch.hideAboveExp);
    if (patch.aiOnly !== undefined) setAi(patch.aiOnly);
    if (patch.remoteOnly !== undefined) setRemote(patch.remoteOnly);
    if (patch.seniority) {
      const added = patch.seniority.find((s) => !sen.has(s));
      const removed = Array.from(sen).find((s) => !patch.seniority!.includes(s));
      toggleSeniority((added ?? removed) as string);
    }
    if (patch.skills) {
      const current = new Set([...Array.from(lang), ...Array.from(infra)]);
      const added = patch.skills.find((s) => !current.has(s));
      const removed = Array.from(current).find((s) => !patch.skills!.includes(s));
      toggleSkill((added ?? removed) as string);
    }
  }

  const sortOptions: Array<SegmentOption<string>> =
    view === "active"
      ? [
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

  const meta =
    `LinkedIn roles posted within ${FRESHNESS_LABEL[config.freshness]} · ` +
    `${config.locations.join(" / ")} · matched to ${config.roles.map((r) => r.title).join(", ")} · ` +
    `refreshed ${fmtRefreshed(refreshedAt)}`;

  const emptyMessage =
    view === "applied"
      ? "No jobs marked Applied yet."
      : view === "saved"
        ? "No saved jobs yet. Tap Saved on a row to keep it here."
        : view === "notinterested"
          ? "Nothing marked Not interested."
          : view === "closed"
            ? "Nothing marked Closed. Use it when a posting turns out to be gone."
            : jobs.length === 0
              ? "No jobs loaded yet — hit Refresh to pull the latest LinkedIn roles."
              : undefined;

  /* ------------------------------- settings -------------------------------- */

  function openSettings() {
    setDraft({
      locations: [...config.locations],
      window: config.freshness,
      titles: config.roles.map((r) => ({ t: r.title, c: r.limit })),
    });
    setShowSettings(true);
  }

  async function saveConfig(thenRefresh: boolean) {
    if (!draft) return;
    const locations = draft.locations.map((l) => l.trim()).filter(Boolean);
    const roles = draft.titles
      .map((t) => ({ title: t.t.trim(), limit: Math.round(Number(t.c)) || 10 }))
      .filter((r) => r.title.length > 0);
    if (locations.length === 0) return setError("Please enter at least one location.");
    if (roles.length === 0) return setError("Add at least one role title.");

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/search-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations, freshness: draft.window, roles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setConfig(data.config as SearchConfig);
      setShowSettings(false);
      if (thenRefresh) void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BoardShell
      nav={
        <TopNav
          page="board"
          onNavigate={(p) => p === "high" && router.push("/highpay")}
          userName={session?.user?.name ?? session?.user?.email ?? undefined}
          avatarUrl={session?.user?.image}
          alertsSlot={session?.user ? <NotificationBell /> : undefined}
          profileHref="/profile"
          onOpenSettings={openSettings}
          themeLabel={themeLabel}
          onToggleTheme={toggleTheme}
        />
      }
      header={
        <BoardHeader
          title="Find the right role. Faster."
          tag="ALL ROLES"
          meta={meta}
          refreshLabel="Refresh"
          onRefresh={refresh}
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
          filters={filters}
          onChange={onFilterChange}
          onReset={reset}
          activeCount={activeFilterCount}
          skillOptions={skillOptions}
          extraToggles={
            <Check checked={strong} onChange={setStrong}>
              Strong matches only (80+)
            </Check>
          }
        />
      }
      overlays={
        draft && (
          <SearchSettingsModal
            open={showSettings}
            config={draft}
            onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
            onClose={() => setShowSettings(false)}
            onSave={() => void saveConfig(false)}
            onSaveAndRun={() => void saveConfig(true)}
            saving={saving}
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

      <ResultsToolbar
        shown={rows.length}
        total={view === "active" ? active.length : rows.length}
        companies={new Set(rows.map((r) => r.company)).size}
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
        Data pulled live from LinkedIn via the Apify <i>valig/linkedin-jobs-scraper</i> actor. Match
        scores &amp; experience parsing are heuristic estimates based on your profile — always read
        the full posting before applying.
      </div>
    </BoardShell>
  );
}
