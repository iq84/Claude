export type Theme = 'light' | 'dark';

const KEY = 'theme';

export function getSavedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

export function resolveTheme(): Theme {
  const saved = getSavedTheme();
  if (saved) return saved;
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage unavailable (private mode etc.); the theme still applies for this visit.
  }
}
