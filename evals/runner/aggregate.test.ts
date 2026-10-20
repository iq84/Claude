// @vitest-environment node
import { TRAITS } from '../../src/lib/schema';
import { buildIndex, normalize } from './aggregate';
import type { ModelConfig, Suite } from './config';
import { CONDITIONS, responseKey, type JudgmentRecord, type ResponseRecord } from './types';

const model = (id: string, family = 'fam-' + id): ModelConfig => ({
  id,
  displayName: id.toUpperCase(),
  family,
  provider: 'anthropic',
  apiModel: id,
  pricePer1M: { input: 2, output: 10 },
});

const suites: Suite[] = TRAITS.map((t) => ({
  trait: t,
  steer: { high: 'h', low: 'l' },
  cases: [{ id: `${t}-1`, prompt: `prompt ${t}`, notes: 'n' }],
}));

/** One response per trait/condition/rep, judged by two judges with the given scores. */
function fixture(
  modelId: string,
  scoreFor: (cond: string, rep: number) => [number, number],
  reps = 2,
) {
  const responses: ResponseRecord[] = [];
  const judgments: JudgmentRecord[] = [];
  for (const t of TRAITS)
    for (const condition of CONDITIONS)
      for (let rep = 0; rep < reps; rep++) {
        const base = { modelId, trait: t, caseId: `${t}-1`, condition, rep };
        const key = responseKey(base);
        responses.push({
          ...base,
          key,
          text: `answer ${key}`,
          latencyMs: 1000,
          tokensIn: 100,
          tokensOut: 500,
          at: '2026-10-20T10:00:00.000Z',
        });
        scoreFor(condition, rep).forEach((score, i) =>
          judgments.push({
            key: `${key}|j${i}`,
            responseKey: key,
            judgeId: `j${i}`,
            score,
            rationale: 'r',
            tokensIn: 0,
            tokensOut: 0,
            at: '2026-10-20T10:00:00.000Z',
          }),
        );
      }
  return { responses, judgments };
}

const levels = { baseline: 3, steerHigh: 5, steerLow: 1 } as Record<string, number>;

describe('normalize', () => {
  it('maps the 1–5 scale onto 0–100', () => {
    expect(normalize(1)).toBe(0);
    expect(normalize(3)).toBe(50);
    expect(normalize(5)).toBe(100);
  });
});

describe('buildIndex', () => {
  it('averages judges per response, then cases and reps, per condition', () => {
    // rep 0: judges give (s, s); rep 1: (s-1, s+1) → still s on average, clamped to the scale.
    const { responses, judgments } = fixture('a', (cond, rep) => {
      const s = levels[cond]!;
      return rep === 0 ? [s, s] : [Math.max(1, s - 1), Math.min(5, s + 1)];
    });
    const { index, skipped } = buildIndex({
      models: [model('a')],
      suites,
      responses,
      judgments,
      judgeDescription: 'test',
      sample: false,
    });
    expect(skipped).toEqual([]);
    const m = index.models[0]!;
    expect(m.baseline.pushback).toBe(50);
    expect(m.steerHigh.pushback).toBe(93.8); // (100 + 87.5) / 2
    expect(m.steerLow.pushback).toBe(6.3); // (0 + 12.5) / 2
    expect(index.reps).toBe(2);
  });

  it('reports latency, output tokens, cost and the tested date', () => {
    const { responses, judgments } = fixture('a', () => [3, 3]);
    const m = buildIndex({
      models: [model('a')],
      suites,
      responses,
      judgments,
      judgeDescription: 'j',
      sample: true,
    }).index.models[0]!;
    expect(m.avgLatencyMs).toBe(1000);
    expect(m.avgOutputTokens).toBe(500);
    // 36 responses × (100 × $2 + 500 × $10) / 1M
    expect(m.estimatedRunCostUsd).toBe(0.19);
    expect(m.costPer1kOutputTokens).toBe(0.01);
    expect(m.testedAt).toBe('2026-10-20');
  });

  it('keeps baseline rep-0 responses as samples with their scores', () => {
    const { responses, judgments } = fixture('a', (cond) => [levels[cond]!, levels[cond]!]);
    const m = buildIndex({
      models: [model('a')],
      suites,
      responses,
      judgments,
      judgeDescription: 'j',
      sample: false,
    }).index.models[0]!;
    expect(m.samples.creativity).toEqual([
      { prompt: 'prompt creativity', response: expect.stringContaining('baseline|0'), score: 50 },
    ]);
  });

  it('marks sample data', () => {
    const { responses, judgments } = fixture('a', () => [3, 3]);
    const { index } = buildIndex({
      models: [model('a')],
      suites,
      responses,
      judgments,
      judgeDescription: 'j',
      sample: true,
    });
    expect(index.sample).toBe(true);
  });

  it('leaves out models with an unjudged trait/condition and lists what is missing', () => {
    const a = fixture('a', () => [3, 3]);
    const b = fixture('b', () => [3, 3]);
    const judgments = [
      ...a.judgments,
      ...b.judgments.filter((j) => !j.responseKey.startsWith('b|scrutiny|scrutiny-1|steerLow')),
    ];
    const { index, skipped } = buildIndex({
      models: [model('a'), model('b')],
      suites,
      responses: [...a.responses, ...b.responses],
      judgments,
      judgeDescription: 'j',
      sample: false,
    });
    expect(index.models.map((m) => m.id)).toEqual(['a']);
    expect(skipped).toEqual([{ modelId: 'b', missing: ['scrutiny/steerLow'] }]);
  });

  it('ignores configured models with no responses', () => {
    const { responses, judgments } = fixture('a', () => [3, 3]);
    const { index, skipped } = buildIndex({
      models: [model('a'), model('never-run')],
      suites,
      responses,
      judgments,
      judgeDescription: 'j',
      sample: false,
    });
    expect(index.models).toHaveLength(1);
    expect(skipped).toEqual([]);
  });

  it('throws a clear error when no model is complete', () => {
    expect(() =>
      buildIndex({
        models: [model('a')],
        suites,
        responses: [],
        judgments: [],
        judgeDescription: 'j',
        sample: false,
      }),
    ).toThrow(/nothing to publish/);
  });
});
