'use client';

import { useRef, type ReactNode } from 'react';
import { Check, ChipGroup } from '../ui/Controls';
import { useStickyRail } from '../../lib/useOpenRolesChrome';
import { PAY_BANDS, SECTORS, SENIORITY, SKILLS } from '../../lib/openrolesUi';

export interface FilterState {
  yoe: number;
  hideAboveExp: boolean;
  seniority: string[];
  skills: string[];
  aiOnly: boolean;
  remoteOnly: boolean;
  /** High Pay board only. */
  bands: string[];
  sectors: string[];
}

interface FilterRailProps {
  isHighPay?: boolean;
  filters: FilterState;
  /** Called with a partial patch — the container owns the state. */
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  /** Number of active filters, shown on the Reset button. */
  activeCount: number;
  /** Override the chip vocabularies if the board computes them from the data. */
  skillOptions?: readonly string[];
  sectorOptions?: readonly string[];
  bandOptions?: readonly string[];
  /** Extra <Check> toggles a board needs (e.g. "strong matches only"). */
  extraToggles?: ReactNode;
}

export default function FilterRail({
  isHighPay = false,
  filters,
  onChange,
  onReset,
  activeCount,
  skillOptions = SKILLS,
  sectorOptions = SECTORS,
  bandOptions = PAY_BANDS,
  extraToggles,
}: FilterRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  useStickyRail(railRef);

  const toggle = (key: 'seniority' | 'skills' | 'bands' | 'sectors') => (value: string) => {
    const current = filters[key];
    onChange({
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    } as Partial<FilterState>);
  };

  return (
    <div className="or-grid__rail">
      <aside className="or-rail" ref={railRef} aria-label="Filters">
        <div className="or-rail__head">
          <div className="or-rail__heading">FILTERS</div>
          <button type="button" className="or-btn--link" onClick={onReset}>
            {activeCount ? `Reset ${activeCount}` : 'Reset'}
          </button>
        </div>

        {isHighPay && (
          <>
            <div className="or-group">
              <div className="or-group__label">PAY BAND</div>
              <ChipGroup
                ariaLabel="Pay band"
                options={bandOptions}
                selected={filters.bands}
                onToggle={toggle('bands')}
              />
            </div>

            <div className="or-group">
              <div className="or-group__label">SECTOR</div>
              <ChipGroup
                ariaLabel="Sector"
                options={sectorOptions}
                selected={filters.sectors}
                onToggle={toggle('sectors')}
              />
            </div>
          </>
        )}

        <div className="or-group">
          <div className="or-group__labelrow">
            <div className="or-group__label" style={{ marginBottom: 0 }}>
              EXPERIENCE
            </div>
            <div className="or-group__value">{filters.yoe} yrs</div>
          </div>
          <input
            className="or-range"
            type="range"
            min={0}
            max={20}
            step={1}
            value={filters.yoe}
            onChange={(e) => onChange({ yoe: Number(e.target.value) })}
            aria-label="Years of experience"
          />
          <Check
            spaced
            checked={filters.hideAboveExp}
            onChange={(v) => onChange({ hideAboveExp: v })}
          >
            Hide roles above my exp
          </Check>
        </div>

        <div className="or-group">
          <div className="or-group__label">SENIORITY</div>
          <ChipGroup
            ariaLabel="Seniority"
            options={SENIORITY}
            selected={filters.seniority}
            onToggle={toggle('seniority')}
          />
        </div>

        <div className="or-group">
          <div className="or-group__label">SKILLS</div>
          <ChipGroup
            ariaLabel="Skills"
            size="sm"
            options={skillOptions}
            selected={filters.skills}
            onToggle={toggle('skills')}
          />
        </div>

        <div className="or-rail__toggles">
          <Check checked={filters.aiOnly} onChange={(v) => onChange({ aiOnly: v })}>
            AI / ML-platform only
          </Check>
          <Check checked={filters.remoteOnly} onChange={(v) => onChange({ remoteOnly: v })}>
            Remote only
          </Check>
          {extraToggles}
        </div>
      </aside>
    </div>
  );
}
