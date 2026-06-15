"use client";

import { useState } from "react";
import {
  FRESHNESS_LABEL,
  FRESHNESS_OPTIONS,
  MAX_LIMIT,
  MAX_ROLES,
  MIN_LIMIT,
  type Freshness,
  type SearchConfig,
} from "@/lib/searchConfig";

export default function SearchSettings({
  initial,
  onClose,
  onSaved,
}: {
  initial: SearchConfig;
  onClose: () => void;
  onSaved: (config: SearchConfig, refresh: boolean) => void;
}) {
  const [location, setLocation] = useState(initial.location);
  const [freshness, setFreshness] = useState<Freshness>(initial.freshness);
  const [roles, setRoles] = useState(initial.roles.map((r) => ({ ...r })));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setRole(i: number, patch: Partial<{ title: string; limit: number }>) {
    setRoles((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRole() {
    if (roles.length < MAX_ROLES) setRoles((prev) => [...prev, { title: "", limit: 15 }]);
  }
  function removeRole(i: number) {
    setRoles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save(refresh: boolean) {
    const cleanRoles = roles
      .map((r) => ({ title: r.title.trim(), limit: r.limit }))
      .filter((r) => r.title.length > 0);
    if (!location.trim()) return setErr("Please enter a location.");
    if (cleanRoles.length === 0) return setErr("Add at least one role title.");

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/search-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: location.trim(), freshness, roles: cleanRoles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(data.config as SearchConfig, refresh);
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
        className="w-full max-w-[520px] rounded-[16px] border border-line bg-panel p-6 shadow-cardhover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="m-0 text-[17px] font-bold tracking-[-0.01em]">Search settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-[12px] text-muted">
          Controls what gets pulled from LinkedIn on refresh. Saved to your account and reused until
          you change it. (The sidebar filters only narrow what&apos;s already fetched.)
        </p>

        {/* location */}
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Location
        </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. India, Bengaluru, Remote"
          className="mb-4 w-full rounded-[9px] border border-line bg-panel-2 px-3 py-[9px] text-[14px] text-ink outline-none focus:border-brand"
        />

        {/* freshness */}
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Posted within
        </label>
        <div className="mb-4 flex flex-wrap gap-[7px]">
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
        <p className="-mt-2 mb-4 text-[11.5px] text-muted">
          Currently: posted within {FRESHNESS_LABEL[freshness]}.
        </p>

        {/* roles */}
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
            Role titles ({roles.length}/{MAX_ROLES})
          </label>
          <button
            onClick={addRole}
            disabled={roles.length >= MAX_ROLES}
            className="text-[12px] font-bold text-brand disabled:opacity-40"
          >
            + Add role
          </button>
        </div>
        <p className="mb-2 text-[11.5px] text-muted">
          Each title is a separate LinkedIn search; limit caps results per title (max {MAX_LIMIT}).
        </p>
        <div className="flex flex-col gap-2">
          {roles.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={r.title}
                onChange={(e) => setRole(i, { title: e.target.value })}
                placeholder="e.g. Backend Engineer"
                className="w-full rounded-[9px] border border-line bg-panel-2 px-3 py-[8px] text-[13.5px] text-ink outline-none focus:border-brand"
              />
              <input
                type="number"
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                value={r.limit}
                onChange={(e) =>
                  setRole(i, {
                    limit: Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.round(Number(e.target.value) || MIN_LIMIT))),
                  })
                }
                className="w-[64px] flex-none rounded-[9px] border border-line bg-panel-2 px-2 py-[8px] text-center text-[13.5px] text-ink outline-none focus:border-brand"
              />
              <button
                onClick={() => removeRole(i)}
                aria-label="Remove role"
                className="grid h-8 w-8 flex-none place-items-center rounded-[9px] border border-line bg-chip text-muted hover:border-red-ink hover:text-red-ink"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

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
            {saving ? "Saving…" : "Save & refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}
