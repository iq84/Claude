import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildIndex } from './aggregate';
import { ROOT_DIR, type EvalConfig } from './config';
import type { JudgmentRecord, ResponseRecord } from './types';
import { readJsonl } from './util';

export const DEFAULT_INDEX_OUT = path.join(ROOT_DIR, 'src/data/index.json');
export const MOCK_INDEX_OUT = path.join(ROOT_DIR, 'evals/results/mock/index.json');

export function loadRun(dir: string) {
  return {
    responses: readJsonl<ResponseRecord>(path.join(dir, 'responses.jsonl')),
    judgments: readJsonl<JudgmentRecord>(path.join(dir, 'judgments.jsonl')),
  };
}

export function judgeDescription(cfg: EvalConfig): string {
  const ids = cfg.judge.judges.map((j) => `${j.apiModel} (${j.family})`).join(', ');
  return `Cross-family panel: each response scored by ${cfg.judge.perResponse} of [${ids}], never by its own family; scores averaged.`;
}

/** Aggregates one run directory and writes the validated index JSON. */
export function buildAndWrite(cfg: EvalConfig, dir: string, out: string, sample: boolean): void {
  const { responses, judgments } = loadRun(dir);
  const { index, skipped } = buildIndex({
    models: cfg.models.models,
    suites: cfg.suites,
    responses,
    judgments,
    judgeDescription: judgeDescription(cfg),
    sample,
  });
  for (const s of skipped) {
    console.warn(`! Left out ${s.modelId}: no judged responses for ${s.missing.join(', ')}`);
  }
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(index, null, 2) + '\n');
  console.log(
    `Wrote ${path.relative(ROOT_DIR, out)} (${index.models.length} models` +
      `${sample ? ', marked as sample data' : ''}).`,
  );
}
