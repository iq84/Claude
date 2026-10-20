import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/** One string-enum value kept in the URL query (e.g. ?tab=compare). Default values are omitted from the URL. */
export function useQueryEnum<T extends string>(key: string, ids: readonly T[], fallback: T) {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = ids.includes(raw as T) ? (raw as T) : fallback;
  const set = useCallback(
    (next: T) =>
      setParams(
        (p) => {
          const q = new URLSearchParams(p);
          if (next === fallback) q.delete(key);
          else q.set(key, next);
          return q;
        },
        { replace: true },
      ),
    [key, fallback, setParams],
  );
  return [value, set] as const;
}

/** A subset of `all` kept in the URL as a comma list; absent means "all". */
export function useQuerySet(key: string, all: readonly string[]) {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const selected = raw === null ? [...all] : raw.split(',').filter((id) => all.includes(id));
  const set = useCallback(
    (next: string[]) =>
      setParams(
        (p) => {
          const q = new URLSearchParams(p);
          if (next.length === all.length) q.delete(key);
          else q.set(key, next.join(','));
          return q;
        },
        { replace: true },
      ),
    [key, all, setParams],
  );
  return [selected, set] as const;
}
