"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface Profile {
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
  hasApifyKey: boolean;
  apifyKeyHint: string | null;
}

export default function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [phone, setPhone] = useState("");
  const [apifyKey, setApifyKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<{ applied: number; saved: number; notinterested: number } | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setP(data);
        setPhone(data.phone ?? "");
      })
      .catch(() => setMsg("Failed to load profile."));
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.status) return;
        const vals = Object.values(data.status) as string[];
        setStats({
          applied: vals.filter((v) => v === "applied").length,
          saved: vals.filter((v) => v === "saved").length,
          notinterested: vals.filter((v) => v === "notinterested").length,
        });
      })
      .catch(() => {
        /* ignore — stats just won't show */
      });
  }, []);

  async function save(body: { phone?: string; apifyKey?: string }, note: string) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setP((prev) =>
        prev
          ? { ...prev, phone: data.phone, hasApifyKey: data.hasApifyKey, apifyKeyHint: data.apifyKeyHint }
          : prev,
      );
      if (body.apifyKey !== undefined) setApifyKey("");
      setMsg(note);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] px-[18px] py-8">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/" className="text-[13px] font-semibold text-brand hover:underline">
          ← Back to job board
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="rounded-[9px] border border-line bg-chip px-3 py-2 text-[12.5px] font-semibold text-sslate hover:border-brand"
        >
          Sign out
        </button>
      </div>

      <h1 className="m-0 mb-4 text-[21px] font-bold tracking-[-0.01em]">Your profile</h1>

      {/* account card */}
      <div className="mb-4 flex items-center gap-4 rounded-[14px] border border-line bg-panel p-4 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p?.image ? (
          <img src={p.image} alt="" className="h-14 w-14 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-chip" />
        )}
        <div>
          <div className="text-[16px] font-bold">{p?.name ?? "—"}</div>
          <div className="text-[13px] text-muted">{p?.email ?? ""}</div>
          {p?.phone && <div className="mt-0.5 text-[12.5px] text-muted">📞 {p.phone}</div>}
        </div>
      </div>

      {/* activity stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Applied" value={stats?.applied} accent="text-sgreen" />
        <StatTile label="Saved jobs" value={stats?.saved} accent="text-sblue" />
        <StatTile label="Not interested" value={stats?.notinterested} accent="text-red-ink" />
      </div>

      {/* phone */}
      <div className="mb-4 rounded-[14px] border border-line bg-panel p-4 shadow-card">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Phone (optional)
        </label>
        <p className="mb-2 text-[12px] text-muted">
          Google doesn&apos;t share your phone number, so add it here if you&apos;d like.
        </p>
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 90000 00000"
            className="w-full rounded-[9px] border border-line bg-panel-2 px-3 py-[9px] text-[14px] text-ink outline-none focus:border-brand"
          />
          <button
            onClick={() => save({ phone }, "Phone saved.")}
            disabled={saving}
            className="whitespace-nowrap rounded-[9px] bg-brand px-4 py-[9px] text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>

      {/* apify key */}
      <div className="mb-4 rounded-[14px] border border-line bg-panel p-4 shadow-card">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Your Apify API key
        </label>
        <p className="mb-2 text-[12px] text-muted">
          Used only for your refreshes. Stored encrypted; never shown again after saving. Get it at{" "}
          <a
            href="https://console.apify.com/account/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            Apify → Integrations
          </a>
          . If you don&apos;t set one, refreshes use the shared fallback key.
        </p>
        <div className="mb-2 text-[12.5px]">
          Status:{" "}
          {p?.hasApifyKey ? (
            <span className="font-semibold text-sgreen">
              key saved {p.apifyKeyHint ? `(${p.apifyKeyHint})` : ""}
            </span>
          ) : (
            <span className="font-semibold text-samber">no key set — using shared fallback</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={apifyKey}
            onChange={(e) => setApifyKey(e.target.value)}
            placeholder="apify_api_..."
            type="password"
            className="w-full rounded-[9px] border border-line bg-panel-2 px-3 py-[9px] text-[14px] text-ink outline-none focus:border-brand"
          />
          <button
            onClick={() => save({ apifyKey }, "Apify key saved.")}
            disabled={saving || !apifyKey.trim()}
            className="whitespace-nowrap rounded-[9px] bg-brand px-4 py-[9px] text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Save key
          </button>
          {p?.hasApifyKey && (
            <button
              onClick={() => save({ apifyKey: "" }, "Apify key removed.")}
              disabled={saving}
              className="whitespace-nowrap rounded-[9px] border border-line bg-chip px-3 py-[9px] text-[13px] font-semibold text-sslate hover:border-[#dc2626] hover:text-[#dc2626] disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {msg && <div className="text-[13px] font-semibold text-brand">{msg}</div>}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent: string;
}) {
  return (
    <div className="rounded-[12px] border border-line bg-panel p-4 text-center shadow-card">
      <div className={`text-[24px] font-extrabold leading-none ${accent}`}>{value ?? "—"}</div>
      <div className="mt-1.5 text-[12px] font-semibold text-muted">{label}</div>
    </div>
  );
}
