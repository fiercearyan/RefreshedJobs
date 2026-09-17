"use client";

import { useEffect, useMemo, useState } from "react";
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
  DEFAULT_HIGH_PAY_CONFIG,
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
  type HighPayConfig,
} from "@/lib/highPayConfig";
import { Check, ChipGroup, ChipRadio } from "@/components/ui/Controls";

const TIER_BY_LABEL = new Map(ALL_TIERS.map((t) => [TIER_LABEL[t], t]));
const CAT_BY_LABEL = new Map(ALL_CATS.map((c) => [CAT_LABEL[c], c]));

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = useMemo(() => selectCompanies(tiers, cats), [tiers, cats]);
  const inScope = selected.length;
  // The actor is queried by company NAME, and one company can be searched under
  // more than one name (e.g. "Optum" and "UnitedHealth Group"), so the run
  // estimate is based on names, not companies.
  const nameCount = useMemo(() => searchNames(selected).length, [selected]);
  const locCount = Math.max(1, locations.filter((l) => l.trim()).length);
  const totalRuns = Math.max(1, Math.ceil(nameCount / Math.max(1, batchSize)) * locCount);
  const waves = Math.max(1, Math.ceil(totalRuns / Math.max(1, concurrency)));

  function toggleBand(label: string) {
    const t = TIER_BY_LABEL.get(label);
    if (!t) return;
    setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }
  function toggleSector(label: string) {
    const c = CAT_BY_LABEL.get(label);
    if (!c) return;
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
      className="or-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="High Pay search settings"
      onClick={onClose}
    >
      <div className="or-modal" onClick={(e) => e.stopPropagation()}>
        <div className="or-modal__head">
          <div>
            <div className="or-modal__title">High Pay search settings</div>
            <div className="or-modal__note">
              Separate from your normal OpenRoles settings — changes here never touch the main
              board. Jobs still come from LinkedIn only; the company filter is applied at search
              time.
            </div>
          </div>
          <button type="button" className="or-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Pay bands ------------------------------------------------------- */}
        <div className="or-section">
          <div className="or-section__label" style={{ marginBottom: 8 }}>
            PAY BANDS
          </div>
          <ChipGroup
            ariaLabel="Pay bands"
            size="pad"
            options={ALL_TIERS.map((t) => TIER_LABEL[t])}
            selected={tiers.map((t) => TIER_LABEL[t])}
            onToggle={toggleBand}
          />
        </div>

        {/* Sectors --------------------------------------------------------- */}
        <div className="or-section">
          <div className="or-section__label" style={{ marginBottom: 8 }}>
            SECTORS
          </div>
          <ChipGroup
            ariaLabel="Sectors"
            size="pad"
            options={ALL_CATS.map((c) => CAT_LABEL[c])}
            selected={cats.map((c) => CAT_LABEL[c])}
            onToggle={toggleSector}
          />
          <div className="or-section__note or-section__note--below">
            <b>{inScope}</b> of {HIGH_PAY_COMPANIES.length} companies selected ({nameCount} names
            incl. parent brands) · one full sweep is {totalRuns} LinkedIn{" "}
            {totalRuns === 1 ? "search" : "searches"}, run {concurrency} at a time — roughly {waves}{" "}
            {waves === 1 ? "wave" : "waves"} of a minute or two. Results land on the board as each
            search finishes.
          </div>
        </div>

        {/* Locations ------------------------------------------------------- */}
        <div className="or-section">
          <div className="or-section__head">
            <div className="or-section__label">LOCATIONS ({locations.length}/{MAX_HP_LOCATIONS})</div>
            <button
              type="button"
              className="or-btn--link"
              onClick={() => locations.length < MAX_HP_LOCATIONS && setLocations((p) => [...p, ""])}
            >
              + Add location
            </button>
          </div>
          <div className="or-fields">
            {locations.map((l, i) => (
              <div className="or-fieldrow" key={i}>
                <input
                  className="or-input"
                  value={l}
                  onChange={(e) =>
                    setLocations((p) => p.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  placeholder="e.g. India, Bengaluru, Remote"
                  aria-label={`Location ${i + 1}`}
                />
                <button
                  type="button"
                  className="or-iconbtn"
                  aria-label={`Remove location ${i + 1}`}
                  onClick={() => setLocations((p) => p.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Posted within --------------------------------------------------- */}
        <div className="or-section">
          <div className="or-section__label" style={{ marginBottom: 8 }}>
            POSTED WITHIN
          </div>
          <ChipRadio
            ariaLabel="Posted within"
            options={FRESHNESS_OPTIONS}
            value={freshness}
            onChange={(v) => setFreshness(v as Freshness)}
          />
          <div className="or-section__note or-section__note--below">
            Currently: posted within {FRESHNESS_LABEL[freshness]}. Top payers post far fewer roles,
            so a wider window makes sense here.
          </div>
        </div>

        {/* Role titles ----------------------------------------------------- */}
        <div className="or-section">
          <div className="or-section__head">
            <div className="or-section__label">ROLE TITLES ({titles.length}/{MAX_HP_TITLES})</div>
            <button
              type="button"
              className="or-btn--link"
              onClick={() => titles.length < MAX_HP_TITLES && setTitles((p) => [...p, ""])}
            >
              + Add title
            </button>
          </div>
          <div className="or-section__note or-section__note--above">
            A posting is kept if its title contains all the words of any one phrase, so &quot;Backend
            Engineer&quot; also catches &quot;Engineer II, Backend&quot;.
          </div>
          <div className="or-fields">
            {titles.map((t, i) => (
              <div className="or-fieldrow" key={i}>
                <input
                  className="or-input"
                  value={t}
                  onChange={(e) => setTitles((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder="e.g. Backend Engineer"
                  aria-label={`Role title ${i + 1}`}
                />
                <button
                  type="button"
                  className="or-iconbtn"
                  aria-label={`Remove title ${i + 1}`}
                  onClick={() => setTitles((p) => p.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Apify run budget ------------------------------------------------ */}
        <div className="or-section">
          <div className="or-section__label" style={{ marginBottom: 8 }}>
            APIFY RUN BUDGET
          </div>
          <div className="or-fieldrow">
            <Num
              label="Batch size"
              hint="companies / run"
              value={batchSize}
              min={HP_BATCH_MIN}
              max={HP_BATCH_MAX}
              onChange={setBatchSize}
            />
            <Num
              label="Run budget"
              hint="searches / press"
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
          <div style={{ marginTop: 10 }}>
            <Check checked={fallbackBroad} onChange={setFallbackBroad}>
              If the company-scoped scan finds nothing, retry once without it and filter locally
            </Check>
          </div>
          <div className="or-section__note or-section__note--below">
            Each run is one LinkedIn search on Apify, and these searches take a minute or more — so
            Scan starts them in the background and collects each one as it finishes, rather than
            waiting. Closing the page doesn&apos;t cancel anything.
          </div>
        </div>

        {/* Optional keyword ------------------------------------------------ */}
        <div className="or-section">
          <input
            className="or-input"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Optional extra LinkedIn keyword (e.g. distributed systems) — usually leave empty"
            aria-label="Extra LinkedIn keyword"
          />
        </div>

        {err && (
          <div className="or-section__note" style={{ marginTop: 12, color: "#e2557b" }}>
            {err}
          </div>
        )}

        <div className="or-modal__foot">
          <button type="button" className="or-btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="or-btn--neutral"
            onClick={() => void save(false)}
            disabled={saving}
          >
            Save
          </button>
          <button
            type="button"
            className="or-btn or-btn--primary"
            onClick={() => void save(true)}
            disabled={saving}
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
    <label style={{ flex: 1, minWidth: 0 }}>
      <span className="or-section__label" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </span>
      <input
        className="or-input or-mono"
        style={{ width: "100%" }}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))))
        }
      />
      <span className="or-section__note" style={{ display: "block", marginTop: 3 }}>
        {hint}
      </span>
    </label>
  );
}
