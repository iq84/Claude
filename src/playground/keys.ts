import type { Provider } from '../lib/playground';

const key = (p: Provider) => `playground-key-${p}`;

/**
 * API keys stay in this browser. By default they live in sessionStorage (gone when the tab closes);
 * "remember" moves them to localStorage. Every access is wrapped: storage can be unavailable.
 */
export function loadKey(p: Provider): { value: string; remembered: boolean } {
  try {
    const local = localStorage.getItem(key(p));
    if (local) return { value: local, remembered: true };
    return { value: sessionStorage.getItem(key(p)) ?? '', remembered: false };
  } catch {
    return { value: '', remembered: false };
  }
}

export function saveKey(p: Provider, value: string, remember: boolean): void {
  try {
    localStorage.removeItem(key(p));
    sessionStorage.removeItem(key(p));
    if (!value) return;
    (remember ? localStorage : sessionStorage).setItem(key(p), value);
  } catch {
    // Storage unavailable: the key still works for this page view.
  }
}

export function forgetAllKeys(): void {
  for (const p of ['anthropic', 'openai', 'google'] as const) saveKey(p, '', false);
}
