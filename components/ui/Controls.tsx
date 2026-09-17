'use client';

import type { ReactNode } from 'react';
import { cx, type SegmentOption } from '../../lib/openrolesUi';

/* -------------------------------------------------------------------------- */
/* Segmented control                                                          */
/* -------------------------------------------------------------------------- */

interface SegmentedProps<T extends string> {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** `status` shows counts, `sort` is the compact results-toolbar variant. */
  variant?: 'nav' | 'status' | 'sort';
  ariaLabel?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = 'nav',
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        'or-seg',
        variant === 'status' && 'or-seg--status or-seg--onsurface',
        variant === 'sort' && 'or-seg--sort'
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            className={cx('or-seg__btn', on && 'or-seg__btn--on')}
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {typeof o.count === 'number' && <span className="or-seg__count"> {o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chips                                                                      */
/* -------------------------------------------------------------------------- */

interface ChipGroupProps {
  /** Plain strings are used as both value and label. */
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'pad';
  ariaLabel?: string;
}

export function ChipGroup({ options, selected, onToggle, size = 'md', ariaLabel }: ChipGroupProps) {
  return (
    <div className="or-chips" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            className={cx(
              'or-chip',
              size === 'sm' && 'or-chip--sm',
              size === 'lg' && 'or-chip--lg',
              size === 'pad' && 'or-chip--pad',
              on && 'or-chip--on'
            )}
            onClick={() => onToggle(o)}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Single-choice chip row — used for "posted within". */
export function ChipRadio({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="or-chips" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          className={cx('or-chip', 'or-chip--lg', o === value && 'or-chip--on')}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Read-only chips — the High Pay "bands & sectors scanned" list. */
export function StaticChips({ options }: { options: readonly string[] }) {
  return (
    <div className="or-chips">
      {options.map((o) => (
        <span key={o} className="or-chip or-chip--pad or-chip--static">
          {o}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Checkbox                                                                   */
/* -------------------------------------------------------------------------- */

export function Check({
  checked,
  onChange,
  children,
  spaced,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  spaced?: boolean;
}) {
  return (
    <label className={cx('or-check', spaced && 'or-check--spaced')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}
