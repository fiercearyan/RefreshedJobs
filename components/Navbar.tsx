"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggleTheme() {
    const isLight = document.documentElement.classList.toggle("light");
    try {
      localStorage.setItem("theme", isLight ? "light" : "dark");
    } catch {
      /* ignore */
    }
    setLight(isLight);
  }

  // No navbar on the sign-in screen.
  if (pathname === "/signin") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-panel shadow-card">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-[18px] py-2.5">
        {/* left: profile */}
        <div className="flex flex-1 justify-start">
          {session?.user ? (
            <Link
              href="/profile"
              title="Your profile & Apify key"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-2 py-1 pl-1 pr-3 text-xs font-semibold shadow-card transition hover:border-brand"
            >
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  className="h-6 w-6 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
                  {(session.user.name || session.user.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-[140px] truncate sm:inline">
                {session.user.name || session.user.email}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </div>

        {/* center: wordmark */}
        <Link href="/" className="text-[18px] font-extrabold tracking-[-0.02em]">
          Open<span className="text-green">Roles</span>
        </Link>

        {/* right: theme toggle + logo */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <button
            onClick={toggleTheme}
            title={light ? "Switch to dark" : "Switch to light"}
            aria-label="Toggle theme"
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel-2 text-muted transition hover:border-brand hover:text-ink"
          >
            {light ? (
              // moon
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
              </svg>
            ) : (
              // sun
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            )}
          </button>
          <Link href="/" aria-label="OpenRoles home" className="flex items-center">
            <Logo size={30} />
          </Link>
        </div>
      </div>
    </header>
  );
}
