"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TWELVE_H = 12 * 60 * 60 * 1000;

interface SavedJob {
  url: string;
  title: string;
  company: string;
  savedAt: number;
}

function agoLabel(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationBell() {
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [readMap, setReadMap] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const loadRef = useRef<() => void>(() => {});

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/status");
      if (!r.ok) return;
      const d = await r.json();
      const status: Record<string, string> = d.status || {};
      const archive: Record<string, { t?: string; c?: string }> = d.archive || {};
      const at: Record<string, number> = d.at || {};
      const list: SavedJob[] = Object.keys(status)
        .filter((u) => status[u] === "saved")
        .map((u) => ({
          url: u,
          title: archive[u]?.t || "Saved job",
          company: archive[u]?.c || "",
          savedAt: at[u] || 0,
        }));
      setSaved(list);
      setReadMap(d.notifReadAt || {});
    } catch {
      /* ignore — bell just stays quiet */
    }
  }, []);
  loadRef.current = load;

  useEffect(() => {
    load();
    const poll = setInterval(() => loadRef.current(), 120_000); // refresh saved set
    const tick = setInterval(() => setNow(Date.now()), 60_000); // advance the clock
    const onFocus = () => loadRef.current();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  // A saved job is "due" once 12h passes since it was saved (or since last read).
  const due = saved.filter(
    (s) => s.savedAt > 0 && now >= (readMap[s.url] ?? s.savedAt) + TWELVE_H,
  );
  const hasUnread = due.length > 0;

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening marks the currently-due notifications as read → dot clears.
    if (next && due.length) {
      const urls = due.map((d) => d.url);
      const stamp = Date.now();
      setReadMap((prev) => {
        const m = { ...prev };
        urls.forEach((u) => (m[u] = stamp));
        return m;
      });
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      }).catch(() => {
        /* ignore; local state already cleared */
      });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        title="Saved-job reminders"
        className="relative grid h-8 w-8 place-items-center rounded-full border border-line bg-panel-2 text-muted transition hover:border-brand hover:text-ink"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {hasUnread && (
          <span className="absolute right-[6px] top-[6px] h-[8px] w-[8px] rounded-full bg-[#ef4444] ring-2 ring-panel" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[300px] rounded-[12px] border border-line bg-panel p-2 shadow-cardhover">
            <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
              Saved-job reminders
            </div>
            {due.length === 0 ? (
              <div className="px-2 py-4 text-center text-[12.5px] text-muted">
                No reminders right now. Saved jobs ping you after 12 hours.
              </div>
            ) : (
              <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto">
                {due.map((d) => (
                  <a
                    key={d.url}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-[9px] border border-line bg-panel-2 px-3 py-2 transition hover:border-brand"
                  >
                    <div className="truncate text-[13px] font-semibold text-ink">🔖 {d.title}</div>
                    <div className="mt-0.5 truncate text-[12px] text-muted">
                      {d.company}
                      {d.company && " · "}saved {agoLabel(now - d.savedAt)} — still on your list
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
