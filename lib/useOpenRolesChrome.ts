'use client';

import { useCallback, useEffect, useState } from 'react';
import { DENSITY_PAD, type Density, type Theme } from './openrolesUi';

const THEME_KEY = 'openroles.theme';

/**
 * Light / dark theme, persisted to localStorage and written to
 * <html data-theme="…">. Purely cosmetic — nothing server-side changes.
 */
export function useTheme(defaultTheme: Theme = 'dark') {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_KEY) : null;
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode — theme just won't persist */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, setTheme, toggleTheme, themeLabel: theme === 'light' ? 'Dark mode' : 'Light mode' };
}

/** Row density → the --rowpad custom property. */
export function useDensity(density: Density = 'default') {
  useEffect(() => {
    document.documentElement.style.setProperty('--rowpad', DENSITY_PAD[density]);
  }, [density]);
}

/**
 * Keeps the sticky filter rail fully visible: if the rail is taller than the
 * viewport it is pulled up so its bottom still lands on screen. Mirrors the
 * mockup's syncRail().
 */
export function useStickyRail(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const sync = () => {
      const rail = ref.current;
      if (!rail) return;
      const fit = window.innerHeight - rail.offsetHeight - 20;
      document.documentElement.style.setProperty('--railtop', `${Math.min(76, fit)}px`);
    };

    sync();
    window.addEventListener('resize', sync);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && ref.current) {
      ro = new ResizeObserver(sync);
      ro.observe(ref.current);
    }

    return () => {
      window.removeEventListener('resize', sync);
      ro?.disconnect();
    };
  }, [ref]);
}
