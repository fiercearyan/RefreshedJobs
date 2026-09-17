'use client';

import { Segmented } from '../ui/Controls';
import {
  ROW_ACTIONS,
  cx,
  matchTone,
  type JobStatus,
  type RoleRow,
  type SegmentOption,
} from '../../lib/openrolesUi';

/* -------------------------------------------------------------------------- */
/* Toolbar                                                                    */
/* -------------------------------------------------------------------------- */

interface ToolbarProps<S extends string> {
  shown: number;
  total: number;
  companies: number;
  /** "no filters" / "3 filters active". */
  filterSummary: string;
  sortOptions: Array<SegmentOption<S>>;
  sort: S;
  onSortChange: (sort: S) => void;
}

export function ResultsToolbar<S extends string>({
  shown,
  total,
  companies,
  filterSummary,
  sortOptions,
  sort,
  onSortChange,
}: ToolbarProps<S>) {
  return (
    <div className="or-toolbar">
      <div className="or-toolbar__count">
        <strong>{shown}</strong> of {total} roles · {companies}{' '}
        {companies === 1 ? 'company' : 'companies'} hiring · {filterSummary}
      </div>
      <Segmented<S>
        ariaLabel="Sort"
        variant="sort"
        options={sortOptions}
        value={sort}
        onChange={onSortChange}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

interface RoleRowProps {
  role: RoleRow;
  showFitLine?: boolean;
  /**
   * Toggling an action: pass the bucket that was clicked, or 'active' when the
   * user clicks the already-active bucket to undo it. Same call your current
   * /api/status handler already makes.
   */
  onSetStatus: (id: string, status: JobStatus) => void;
}

export function RoleListRow({ role, showFitLine = true, onSetStatus }: RoleRowProps) {
  return (
    <div className="or-row">
      <div className="or-row__match">
        <div className={cx('or-row__score', matchTone(role.match))}>{role.match}</div>
        <div className="or-row__scorelabel">MATCH</div>
      </div>

      <div className="or-row__main">
        <div className="or-row__titleline">
          <a className="or-row__title" href={role.url} target="_blank" rel="noreferrer">
            {role.title}
          </a>
          <span className="or-row__company">{role.company}</span>
          {role.ai && <span className="or-badge">AI / ML</span>}
        </div>

        <div className="or-row__meta">
          {role.pay && <span className="or-row__pay">{role.pay}</span>}
          <span>{role.meta}</span>
          {role.careersUrl && (
            <a className="or-row__careers" href={role.careersUrl} target="_blank" rel="noreferrer">
              careers ↗
            </a>
          )}
        </div>

        {role.skills.length > 0 && (
          <div className="or-skills">
            {role.skills.map((s) => (
              <span className="or-skill" key={s}>
                {s}
              </span>
            ))}
          </div>
        )}

        {showFitLine && role.fit && <div className="or-row__fit">{role.fit}</div>}
      </div>

      <div className="or-row__side">
        <div className="or-row__actions">
          {ROW_ACTIONS.map((a) => {
            const on = role.status === a.status;
            return (
              <button
                key={a.status}
                type="button"
                aria-pressed={on}
                title={on ? a.on : a.off}
                className={cx('or-action', on && 'or-action--on')}
                onClick={() => onSetStatus(role.id, on ? 'active' : a.status)}
              >
                {on ? a.on : a.off}
              </button>
            );
          })}
        </div>

        <div className="or-row__foot">
          {role.applicants && <span className="or-applicants">{role.applicants}</span>}
          <a className="or-view" href={role.url} target="_blank" rel="noreferrer">
            View posting →
          </a>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

interface RoleListProps {
  roles: RoleRow[];
  showFitLine?: boolean;
  onSetStatus: (id: string, status: JobStatus) => void;
  onResetFilters: () => void;
  /** Shown instead of the reset prompt when the board has no data at all. */
  emptyMessage?: string;
}

export default function RoleList({
  roles,
  showFitLine = true,
  onSetStatus,
  onResetFilters,
  emptyMessage,
}: RoleListProps) {
  return (
    <div className="or-list">
      {roles.map((r) => (
        <RoleListRow key={r.id} role={r} showFitLine={showFitLine} onSetStatus={onSetStatus} />
      ))}

      {roles.length === 0 && (
        <div className="or-empty">
          {emptyMessage ?? (
            <>
              No roles match these filters.{' '}
              <button type="button" className="or-btn--link" onClick={onResetFilters}>
                Reset filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
