import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
const STORAGE_KEY = 'locale-theme';
const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark' || value === 'system';
const ThemeContext = createContext<{ theme: Theme; resolvedTheme: ResolvedTheme; setTheme: (theme: Theme) => void }>({ theme: 'system', resolvedTheme: 'light', setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Deterministic initial state keeps the pre-rendered homepage hydratable.
  const [theme, setPreference] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const preference = useRef<Theme>('system');
  const apply = useCallback((next: Theme) => {
    const resolved = next === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next;
    preference.current = next;
    setPreference(next);
    setResolvedTheme(resolved);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#1c201d' : '#f8f7f4');
  }, []);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Theme controls still work when storage is disabled. */ }
    apply(isTheme(saved) ? saved : 'system');
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const systemChanged = () => { if (preference.current === 'system') apply('system'); };
    const storageChanged = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) apply(isTheme(event.newValue) ? event.newValue : 'system'); };
    media.addEventListener('change', systemChanged);
    window.addEventListener('storage', storageChanged);
    return () => { media.removeEventListener('change', systemChanged); window.removeEventListener('storage', storageChanged); };
  }, [apply]);

  const setTheme = useCallback((next: Theme) => {
    apply(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the selected theme for this session. */ }
  }, [apply]);

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
