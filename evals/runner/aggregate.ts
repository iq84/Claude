import {
  PersonalityIndexSchema,
  TRAITS,
  type ModelResult,
  type PersonalityIndex,
  type Sample,
  type Trait,
} from '../../src/lib/schema';
import type { ModelConfig, Suite } from './config';
import { CONDITIONS, type Condition, type JudgmentRecord, type ResponseRecord } from './types';

/** Maps a 1–5 judge score onto 0–100. */
export function normalize(score: number): number {
  return ((score - 1) / 4) * 100;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (x: number) => Math.round(x * 10) / 10;

export interface BuildInput {
  models: ModelConfig[];
  suites: Suite[];
  responses: ResponseRecord[];
  judgments: JudgmentRecord[];
  judgeDescription: string;
  sample: boolean;
  generatedAt?: string;
}

export interface BuildOutput {
  index: PersonalityIndex;
  /** Models left out because some trait/condition had no judged responses. */
  skipped: { modelId: string; missing: string[] }[];
}

/**
 * Aggregates raw responses and judgments into the Personality Index (PRD §7.5):
 * each response's score is the mean of its judges; trait scores are the mean across cases and reps,
 * normalised to 0–100. Responses without any judgment are ignored.
 */
export function buildIndex(input: BuildInput): BuildOutput {
  const judgedScore = new Map<string, number>();
  const byResponse = new Map<string, number[]>();
  for (const j of input.judgments) {
    const list = byResponse.get(j.responseKey) ?? [];
    list.push(j.score);
    byResponse.set(j.responseKey, list);
  }
  for (const [key, scores] of byResponse) judgedScore.set(key, normalize(mean(scores)));

  const promptById = new Map(input.suites.flatMap((s) => s.cases.map((c) => [c.id, c.prompt])));
  const models: ModelResult[] = [];
  const skipped: BuildOutput['skipped'] = [];

  for (const m of input.models) {
    const rs = input.responses.filter((r) => r.modelId === m.id);
    if (rs.length === 0) continue;

    const scores = {} as Record<Condition, Record<Trait, number>>;
    const missing: string[] = [];
    for (const cond of CONDITIONS) {
      scores[cond] = {} as Record<Trait, number>;
      for (const t of TRAITS) {
        const vals = rs
          .filter((r) => r.trait === t && r.condition === cond)
          .map((r) => judgedScore.get(r.key))
          .filter((v): v is number => v !== undefined);
        if (vals.length === 0) missing.push(`${t}/${cond}`);
        else scores[cond][t] = round1(mean(vals));
      }
    }
    if (missing.length) {
      skipped.push({ modelId: m.id, missing });
      continue;
    }

    const samples = {} as Record<Trait, Sample[]>;
    for (const t of TRAITS) {
      samples[t] = rs
        .filter((r) => r.trait === t && r.condition === 'baseline' && r.rep === 0)
        .filter((r) => judgedScore.has(r.key))
        .sort((a, b) => a.caseId.localeCompare(b.caseId))
        .map((r) => ({
          prompt: promptById.get(r.caseId) ?? '',
          response: r.text,
          score: round1(judgedScore.get(r.key)!),
        }));
    }

    const cost = rs.reduce(
      (sum, r) => sum + (r.tokensIn * m.pricePer1M.input + r.tokensOut * m.pricePer1M.output) / 1e6,
      0,
    );
    models.push({
      id: m.id,
      displayName: m.displayName,
      provider: m.provider,
      testedAt: rs
        .map((r) => r.at.slice(0, 10))
        .sort()
        .at(-1)!,
      baseline: scores.baseline,
      steerHigh: scores.steerHigh,
      steerLow: scores.steerLow,
      avgLatencyMs: Math.round(mean(rs.map((r) => r.latencyMs))),
      avgOutputTokens: Math.round(mean(rs.map((r) => r.tokensOut))),
      estimatedRunCostUsd: Math.round(cost * 100) / 100,
      costPer1kOutputTokens: m.pricePer1M.output / 1000,
      samples,
    });
  }

  if (models.length === 0) {
    throw new Error(
      'No model has judged responses for every trait and condition; nothing to publish. ' +
        `Incomplete: ${skipped.map((s) => s.modelId).join(', ') || 'none'}.`,
    );
  }
  const reps = Math.max(1, ...input.responses.map((r) => r.rep + 1));
  const index = PersonalityIndexSchema.parse({
    version: '1',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sample: input.sample,
    judge: input.judgeDescription,
    reps,
    models,
  });
  return { index, skipped };
}
