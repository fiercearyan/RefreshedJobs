'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Segmented } from '../ui/Controls';

export type BoardPage = 'board' | 'high';

interface TopNavProps {
  page: BoardPage;
  onNavigate: (page: BoardPage) => void;
  userName?: string;
  avatarUrl?: string | null;
  hasUnreadAlerts?: boolean;
  onOpenAlerts?: () => void;
  /** Render a richer alerts control (the saved-job bell) instead of the button. */
  alertsSlot?: ReactNode;
  /** When set, the user block links here (the profile page). */
  profileHref?: string;
  onOpenSettings: () => void;
  themeLabel: string;
  onToggleTheme: () => void;
}

export default function TopNav({
  page,
  onNavigate,
  userName,
  avatarUrl,
  hasUnreadAlerts,
  onOpenAlerts,
  alertsSlot,
  profileHref,
  onOpenSettings,
  themeLabel,
  onToggleTheme,
}: TopNavProps) {
  const initial = (userName || '?').trim().charAt(0).toUpperCase();

  const user = (
    <>
      <div className="or-avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : initial}
      </div>
      {userName && <div className="or-nav__username">{userName}</div>}
    </>
  );

  return (
    <header className="or-nav">
      <div className="or-nav__brand">
        <div className="or-nav__mark" aria-hidden="true" />
        <div className="or-nav__word">OpenRoles</div>
      </div>

      <Segmented<BoardPage>
        ariaLabel="Board"
        value={page}
        onChange={onNavigate}
        options={[
          { value: 'board', label: 'All roles' },
          { value: 'high', label: 'High Pay' },
        ]}
      />

      <div className="or-nav__spacer" />

      {alertsSlot ?? (
        <button
          type="button"
          className="or-btn or-nav__alerts"
          onClick={onOpenAlerts}
          title="Notifications"
        >
          Alerts
          {hasUnreadAlerts && <span className="or-nav__dot" aria-label="unread" />}
        </button>
      )}

      <button type="button" className="or-btn" onClick={onToggleTheme}>
        {themeLabel}
      </button>

      <button type="button" className="or-btn" onClick={onOpenSettings}>
        Settings
      </button>

      {profileHref ? (
        <Link className="or-nav__user" href={profileHref} title="Your profile & Apify key">
          {user}
        </Link>
      ) : (
        <div className="or-nav__user">{user}</div>
      )}
    </header>
  );
}
