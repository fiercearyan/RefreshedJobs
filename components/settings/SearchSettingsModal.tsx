'use client';

import { useEffect } from 'react';
import { ChipRadio, StaticChips } from '../ui/Controls';
import { PAY_BANDS, POSTED_WITHIN, SECTORS } from '../../lib/openrolesUi';

export interface TitleRule {
  /** Role title phrase. */
  t: string;
  /** Result cap for this title. */
  c: number | string;
}

export interface SearchConfig {
  locations: string[];
  window: string;
  titles: TitleRule[];
}

interface SearchSettingsModalProps {
  open: boolean;
  /** Switches copy, the extra "scanned" section and the primary button label. */
  isHighPay?: boolean;
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  onClose: () => void;
  onSave: () => void;
  onSaveAndRun: () => void;
  saving?: boolean;
  /** High Pay only — the sweep line under the scanned chips. */
  sweepNote?: string;
  scannedChips?: readonly string[];
}

export default function SearchSettingsModal({
  open,
  isHighPay = false,
  config,
  onChange,
  onClose,
  onSave,
  onSaveAndRun,
  saving,
  sweepNote,
  scannedChips,
}: SearchSettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setLocation = (i: number, value: string) => {
    const next = config.locations.slice();
    next[i] = value;
    onChange({ locations: next });
  };

  const setTitle = (i: number, patch: Partial<TitleRule>) => {
    const next = config.titles.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ titles: next });
  };

  return (
    <div
      className="or-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={isHighPay ? 'High Pay search settings' : 'Search settings'}
      onClick={onClose}
    >
      <div className="or-modal" onClick={(e) => e.stopPropagation()}>
        <div className="or-modal__head">
          <div>
            <div className="or-modal__title">
              {isHighPay ? 'High Pay search settings' : 'Search settings'}
            </div>
            <div className="or-modal__note">
              {isHighPay
                ? 'Separate from your normal OpenRoles settings — changes here never touch the main board. Jobs still come from LinkedIn only; the company filter is applied at search time.'
                : 'Controls what gets pulled from LinkedIn on refresh. Saved to your account and reused until you change it. Sidebar filters only narrow what is already fetched.'}
            </div>
          </div>
          <button type="button" className="or-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Locations ------------------------------------------------------- */}
        <div className="or-section">
          <div className="or-section__head">
            <div className="or-section__label">LOCATIONS</div>
            <button
              type="button"
              className="or-btn--link"
              onClick={() => onChange({ locations: [...config.locations, ''] })}
            >
              + Add location
            </button>
          </div>
          <div className="or-fields">
            {config.locations.map((l, i) => (
              <div className="or-fieldrow" key={i}>
                <input
                  className="or-input"
                  value={l}
                  onChange={(e) => setLocation(i, e.target.value)}
                  aria-label={`Location ${i + 1}`}
                />
                <button
                  type="button"
                  className="or-iconbtn"
                  aria-label={`Remove location ${i + 1}`}
                  onClick={() =>
                    onChange({ locations: config.locations.filter((_, j) => j !== i) })
                  }
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
            options={POSTED_WITHIN}
            value={config.window}
            onChange={(w) => onChange({ window: w })}
          />
          <div className="or-section__note or-section__note--below">
            Currently: posted within {config.window}
            {isHighPay
              ? '. Top payers post far fewer roles, so a wider window makes sense here.'
              : '.'}
          </div>
        </div>

        {/* Role titles ----------------------------------------------------- */}
        <div className="or-section">
          <div className="or-section__head">
            <div className="or-section__label">ROLE TITLES</div>
            <button
              type="button"
              className="or-btn--link"
              onClick={() =>
                onChange({ titles: [...config.titles, { t: '', c: isHighPay ? 25 : 20 }] })
              }
            >
              + Add title
            </button>
          </div>
          <div className="or-section__note or-section__note--above">
            {isHighPay
              ? 'A posting is kept if its title contains all the words of any one phrase, so "Backend Engineer" also catches "Engineer II, Backend".'
              : 'Each title is a separate LinkedIn search; the number caps results per title (max 25).'}
          </div>
          <div className="or-fields">
            {config.titles.map((t, i) => (
              <div className="or-fieldrow" key={i}>
                <input
                  className="or-input"
                  value={t.t}
                  onChange={(e) => setTitle(i, { t: e.target.value })}
                  aria-label={`Role title ${i + 1}`}
                />
                <input
                  className="or-input or-input--cap"
                  value={t.c}
                  onChange={(e) => setTitle(i, { c: e.target.value })}
                  aria-label={`Result cap for title ${i + 1}`}
                />
                <button
                  type="button"
                  className="or-iconbtn"
                  aria-label={`Remove title ${i + 1}`}
                  onClick={() => onChange({ titles: config.titles.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* High Pay: scanned bands & sectors -------------------------------- */}
        {isHighPay && (
          <div className="or-section">
            <div className="or-section__label" style={{ marginBottom: 8 }}>
              PAY BANDS &amp; SECTORS SCANNED
            </div>
            <StaticChips options={scannedChips ?? [...PAY_BANDS, ...SECTORS]} />
            {sweepNote && (
              <div className="or-section__note or-section__note--below">{sweepNote}</div>
            )}
          </div>
        )}

        <div className="or-modal__foot">
          <button type="button" className="or-btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="or-btn--neutral" onClick={onSave} disabled={saving}>
            Save
          </button>
          <button
            type="button"
            className="or-btn or-btn--primary"
            onClick={onSaveAndRun}
            disabled={saving}
          >
            {isHighPay ? 'Save & scan' : 'Save & refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}
