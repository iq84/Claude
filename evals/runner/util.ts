import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { EVALS_DIR } from './config';

export function resultsDir(mock: boolean, date: string): string {
  return path.join(EVALS_DIR, 'results', mock ? 'mock' : 'raw', date);
}

/** Most recent YYYY-MM-DD run directory, if any. */
export function latestRunDate(mock: boolean): string | undefined {
  const base = path.join(EVALS_DIR, 'results', mock ? 'mock' : 'raw');
  if (!existsSync(base)) return undefined;
  return readdirSync(base)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .at(-1);
}

export function readJsonl<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

export function appendJsonl(file: string, record: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(record) + '\n');
}

const NON_RETRYABLE = new Set([400, 401, 403, 404, 422]);

/** Retries with exponential backoff (2s, 4s, 8s…); bad requests and auth errors fail at once. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    attempts = 4,
    baseMs = 2000,
    sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  } = {},
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number }).status;
      if (status !== undefined && NON_RETRYABLE.has(status)) throw err;
      if (i < attempts - 1) await sleep(baseMs * 2 ** i * (0.75 + Math.random() * 0.5));
    }
  }
  throw lastError;
}

/** Runs tasks with at most `limit` in flight. */
export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]!);
  });
  await Promise.all(lanes);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) continue;
    const [k, inline] = a.slice(2).split('=', 2) as [string, string | undefined];
    const nxt = argv[i + 1];
    if (inline !== undefined) out[k] = inline;
    else if (nxt !== undefined && !nxt.startsWith('--')) out[k] = argv[++i]!;
    else out[k] = true;
  }
  return out;
}

export function loadDotEnv(): void {
  try {
    process.loadEnvFile(path.resolve(EVALS_DIR, '..', '.env'));
  } catch {
    // No .env file; rely on the shell environment.
  }
}
