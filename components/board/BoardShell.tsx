'use client';

import type { ReactNode } from 'react';
import { useDensity } from '../../lib/useOpenRolesChrome';
import type { Density } from '../../lib/openrolesUi';

interface BoardShellProps {
  /** <TopNav /> */
  nav: ReactNode;
  /** <BoardHeader /> */
  header: ReactNode;
  /** <FilterRail /> */
  rail: ReactNode;
  /** <ResultsToolbar /> + <RoleList /> */
  children: ReactNode;
  /** <SearchSettingsModal /> and any other overlays. */
  overlays?: ReactNode;
  density?: Density;
}

export default function BoardShell({
  nav,
  header,
  rail,
  children,
  overlays,
  density = 'default',
}: BoardShellProps) {
  useDensity(density);

  return (
    <div className="or-root">
      {nav}
      <main className="or-shell">
        {header}
        <div className="or-grid">
          {rail}
          <div>{children}</div>
        </div>
      </main>
      {overlays}
    </div>
  );
}
