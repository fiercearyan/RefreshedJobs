'use client';

import { Segmented } from '../ui/Controls';
import { STATUS_TABS, type JobStatus } from '../../lib/openrolesUi';

interface BoardHeaderProps {
  title: string;
  tag: string;
  /** The "LinkedIn roles posted within 24h · Bangalore … refreshed …" line. */
  meta: string;
  refreshLabel: string;
  onRefresh: () => void;
  refreshing?: boolean;

  query: string;
  onQueryChange: (value: string) => void;

  status: JobStatus;
  onStatusChange: (status: JobStatus) => void;
  /** Row count per bucket, e.g. { active: 8, applied: 0, … }. */
  counts: Record<JobStatus, number>;
}

export default function BoardHeader({
  title,
  tag,
  meta,
  refreshLabel,
  onRefresh,
  refreshing,
  query,
  onQueryChange,
  status,
  onStatusChange,
  counts,
}: BoardHeaderProps) {
  return (
    <>
      <div className="or-head">
        <div className="or-head__text">
          <div className="or-head__titleline">
            <h1 className="or-head__title">{title}</h1>
            <span className="or-tag">{tag}</span>
          </div>
          <div className="or-head__meta">{meta}</div>
        </div>
        <div className="or-head__spacer" />
        <button
          type="button"
          className="or-btn or-btn--primary"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Working…' : refreshLabel}
        </button>
      </div>

      <div className="or-controls">
        <div className="or-search">
          <span className="or-search__icon" aria-hidden="true">
            ⌕
          </span>
          <input
            className="or-search__input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search company, title, skill or location…"
            aria-label="Search roles"
          />
        </div>

        <Segmented<JobStatus>
          ariaLabel="Status"
          variant="status"
          value={status}
          onChange={onStatusChange}
          options={STATUS_TABS.map((t) => ({ ...t, count: counts[t.value] ?? 0 }))}
        />
      </div>
    </>
  );
}
