"use client";

import { useMemo, useState } from "react";
import { FRESHNESS_LABEL, FRESHNESS_OPTIONS, type Freshness } from "@/lib/searchConfig";
import {
  ALL_CATS,
  ALL_TIERS,
  CAT_LABEL,
  HIGH_PAY_COMPANIES,
  TIER_LABEL,
  searchNames,
  selectCompanies,
  type HighPayCat,
  type HighPayTier,
} from "@/lib/highPayCompanies";
import {
  HP_BATCH_MAX,
  HP_BATCH_MIN,
  HP_CONCURRENCY_MAX,
  HP_CONCURRENCY_MIN,
  HP_LIMIT_MAX,
  HP_LIMIT_MIN,
  HP_MAX_BATCHES_MAX,
  HP_MAX_BATCHES_MIN,
  MAX_HP_LOCATIONS,
  MAX_HP_TITLES,
  DEFAULT_HIGH_PAY_CONFIG,
  type HighPayConfig,
} from "@/lib/highPayConfig";

export default function HighPaySettings({
  initial,
  onClose,
  onSaved,
}: {
  initial: HighPayConfig;
  onClose: () => void;
  onSaved: (config: HighPayConfig, companies: number, refresh: boolean) => void;
}) {
  const [locations, setLocations] = useState<string[]>(
    initial.locations.length ? initial.locations : [""],
  );
  const [freshness, setFreshness] = useState<Freshness>(initial.freshness);
  const [titles, setTitles] = useState<string[]>(initial.titles.length ? initial.titles : [""]);
  const [keywords, setKeywords] = useState(initial.keywords ?? "");
  const [tiers, setTiers] = useState<HighPayTier[]>(initial.tiers);
  const [cats, setCats] = useState<HighPayCat[]>(initial.cats);
  const [batchSize, setBatchSize] = useState(initial.batchSize);
  const [limit, setLimit] = useState(initial.limit);
  const [maxBatches, setMaxBatches] = useState(initial.maxBatches);
  const [concurrency, setConcurrency] = useState(
    initial.concurrency ?? DEFAULT_HIGH_PAY_CONFIG.concurrency,
  );
  const [fallbackBroad, setFallbackBroad] = useState(initial.fallbackBroad);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(() => selectCompanies(tiers, cats), [tiers, cats]);
  const inScope = selected.length;
  // The actor is queried by company NAME, and one company can be searched under
  // more than one name (e.g. "Optum" and "UnitedHealth Group"), so the run
  // estimate is based on names, not companies.
  const nameCount = useMemo(() => searchNames(selected).length, [selected]);
  const locCount = Math.max(1, locations.filter((l) => l.trim()).length);
  const plannedRuns = Math.min(
    maxBatches,
    Math.ceil(nameCount / Math.max(1, batchSize)) * locCount,
  );
  const coveredNames = Math.min(nameCount, Math.ceil(plannedRuns / locCount) * batchSize);
  const scansForFullSweep = Math.max(1, Math.ceil(nameCount / Math.max(1, coveredNames)));

  function toggleTier(t: HighPayTier) {
    setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }
  function toggleCat(c: HighPayCat) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function save(refresh: boolean) {
    const cleanLocations = locations.map((l) => l.trim()).filter(Boolean);
    const cleanTitles = titles.map((t) => t.trim()).filter(Boolean);
    if (cleanLocations.length === 0) return setErr("Please enter at least one location.");
    if (cleanTitles.length === 0) return setErr("Add at least one role title.");
    if (tiers.length === 0) return setErr("Pick at least one pay band.");
    if (cats.length === 0) return setErr("Pick at least one sector.");

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/highpay-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: cleanLocations,
          freshness,
          titles: cleanTitles,
          keywords: keywords.trim(),
          tiers,
          cats,
          batchSize,
          limit,
          maxBatches,
          concurrency,
          fallbackBroad,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(data.config as HighPayConfig, data.companies ?? inScope, refresh);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-[16px] border border-line bg-panel p-6 shadow-cardhover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="m-0 text-[17px] font-bold tracking-[-0.01em]">High Pay search settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-[12px] text-muted">
          Separate from your normal OpenRoles search settings — changing anything here never touches
          the main board. Jobs still come from LinkedIn only; the company filter is applied at search
          time.
        </p>

        {/* pay bands */}
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Pay bands
        </label>
        <div className="mb-4 flex flex-wrap gap-[7px]">
          {ALL_TIERS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTier(t)}
              className={`rounded-full border px-[12px] py-[6px] text-[12px] font-semibold transition ${
                tiers.includes(t)
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-chip text-chip-ink hover:border-brand"
              }`}
            >
              {TIER_LABEL[t]}
            </button>
          ))}
        </div>

        {/* sectors */}
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Sectors
        </label>
        <div className="mb-2 flex flex-wrap gap-[7px]">
          {ALL_CATS.map((c) => (
            <button
              key={c}
              onClick={() => toggleCat(c)}
              className={`rounded-full border px-[12px] py-[6px] text-[12px] font-semibold transition ${
                cats.includes(c)
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-chip text-chip-ink hover:border-brand"
              }`}
            >
              {CAT_LABEL[c]}
            </button>
          ))}
        </div>
        <p className="mb-4 text-[11.5px] text-muted">
          <b className="text-ink">{inScope}</b> of {HIGH_PAY_COMPANIES.length} High Pay Radar
          companies selected ({nameCount} names incl. parent brands) · each scan covers about{" "}
          {coveredNames} of them across ~{plannedRuns} LinkedIn searches
          {scansForFullSweep > 1 && <>, so ~{scansForFullSweep} scans sweep the whole list</>}. The
          next scan resumes where the last one stopped, and results accumulate on the board.
        </p>

        {/* locations */}
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
            Locations ({locations.length}/{MAX_HP_LOCATIONS})
          </label>
          <button
            onClick={() => locations.length < MAX_HP_LOCATIONS && setLocations((p) => [...p, ""])}
            disabled={locations.length >= MAX_HP_LOCATIONS}
            className="text-[12px] font-bold text-brand disabled:opacity-40"
          >
            + Add location
          </button>
        </div>
        <div className="mb-4 flex flex-col gap-2">
          {locations.map((loc, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={loc}
                onChange={(e) =>
                  setLocations((p) => p.map((l, idx) => (idx === i ? e.target.value : l)))
                }
                placeholder={i === 0 ? "e.g. India, Bengaluru, Remote" : "Second location (optional)"}
                className="w-full rounded-[9px] border border-line bg-panel-2 px-3 py-[9px] text-[14px] text-ink outline-none focus:border-brand"
              />
              {locations.length > 1 && (
                <button
                  onClick={() => setLocations((p) => p.filter((_, idx) => idx !== i))}
                  aria-label="Remove location"
                  className="grid h-8 w-8 flex-none place-items-center rounded-[9px] border border-line bg-chip text-muted hover:border-red-ink hover:text-red-ink"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* freshness */}
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Posted within
        </label>
        <div className="mb-2 flex flex-wrap gap-[7px]">
          {FRESHNESS_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFreshness(f)}
              className={`rounded-full border px-[12px] py-[6px] text-[12px] font-semibold transition ${
                freshness === f
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-chip text-chip-ink hover:border-brand"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="mb-4 text-[11.5px] text-muted">
          Currently: posted within {FRESHNESS_LABEL[freshness]}. Top payers post far fewer roles — a
          wider window than the main board usually makes sense here.
        </p>

        {/* titles */}
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
            Role titles ({titles.length}/{MAX_HP_TITLES})
          </label>
          <button
            onClick={() => titles.length < MAX_HP_TITLES && setTitles((p) => [...p, ""])}
            disabled={titles.length >= MAX_HP_TITLES}
            className="text-[12px] font-bold text-brand disabled:opacity-40"
          >
            + Add title
          </button>
        </div>
        <p className="mb-2 text-[11.5px] text-muted">
          A posting is kept if its title contains all the words of any one phrase (order doesn&apos;t
          matter), so &quot;Backend Engineer&quot; also catches &quot;Engineer II, Backend&quot;.
        </p>
        <div className="mb-4 flex flex-col gap-2">
          {titles.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={t}
                onChange={(e) =>
                  setTitles((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))
                }
                placeholder="e.g. Backend Engineer"
                className="w-full rounded-[9px] border border-line bg-panel-2 px-3 py-[8px] text-[13.5px] text-ink outline-none focus:border-brand"
              />
              <button
                onClick={() => setTitles((p) => p.filter((_, idx) => idx !== i))}
                aria-label="Remove title"
                className="grid h-8 w-8 flex-none place-items-center rounded-[9px] border border-line bg-chip text-muted hover:border-red-ink hover:text-red-ink"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* advanced */}
        <details className="mb-2 rounded-[10px] border border-line bg-panel-2 px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-bold text-sslate">
            Advanced — Apify run budget
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Num
              label="Batch size"
              hint="companies / run"
              value={batchSize}
              min={HP_BATCH_MIN}
              max={HP_BATCH_MAX}
              onChange={setBatchSize}
            />
            <Num
              label="Max runs"
              hint="per scan"
              value={maxBatches}
              min={HP_MAX_BATCHES_MIN}
              max={HP_MAX_BATCHES_MAX}
              onChange={setMaxBatches}
            />
            <Num
              label="Runs at once"
              hint="Apify allows 5"
              value={concurrency}
              min={HP_CONCURRENCY_MIN}
              max={HP_CONCURRENCY_MAX}
              onChange={setConcurrency}
            />
            <Num
              label="Result cap"
              hint="items / run"
              value={limit}
              min={HP_LIMIT_MIN}
              max={HP_LIMIT_MAX}
              onChange={setLimit}
            />
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold">
            <input
              type="checkbox"
              checked={fallbackBroad}
              onChange={(e) => setFallbackBroad(e.target.checked)}
            />
            If the company-scoped scan finds nothing, retry once without it and filter locally
          </label>
          <p className="mt-2 text-[11px] leading-[1.5] text-muted">
            Each run is one LinkedIn search on Apify. Runs go out &quot;Runs at once&quot; at a time
            under a 50-second deadline — Apify free plans allow <b>5 concurrent Actor runs in
            total</b>, so leaving headroom here avoids a 402 when the main board is also refreshing.
            Smaller batches finish more reliably; the scan just resumes from where it stopped next
            time.
          </p>
        </details>

        {/* optional keyword */}
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Optional extra LinkedIn keyword (e.g. distributed systems) — usually leave empty"
          className="mb-1 w-full rounded-[9px] border border-line bg-panel-2 px-3 py-[8px] text-[13px] text-ink outline-none focus:border-brand"
        />

        {err && <div className="mt-3 text-[12.5px] font-semibold text-red-ink">{err}</div>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[9px] border border-line bg-chip px-4 py-[9px] text-[13px] font-semibold text-sslate hover:border-brand"
          >
            Cancel
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-[9px] border border-line bg-panel-2 px-4 py-[9px] text-[13px] font-bold text-ink hover:border-brand disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-[9px] bg-brand px-4 py-[9px] text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & scan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Num({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-sslate">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))))
        }
        className="mt-1 w-full rounded-[9px] border border-line bg-panel px-2 py-[7px] text-center text-[13.5px] text-ink outline-none focus:border-brand"
      />
      <span className="mt-[2px] block text-[10.5px] text-muted">{hint}</span>
    </label>
  );
}
