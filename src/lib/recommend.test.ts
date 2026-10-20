import { DEFAULT_DRAFT, type AgentDraft } from './builder';
import { achievableRange, recommend, traitFit } from './recommend';
import { TRAITS, type ModelResult, type Trait } from './schema';

const flat = (v: number) => Object.fromEntries(TRAITS.map((t) => [t, v])) as Record<Trait, number>;
const emptySamples = Object.fromEntries(
  TRAITS.map((t) => [t, []]),
) as unknown as ModelResult['samples'];

function model(
  id: string,
  opts: {
    base?: number;
    low?: number;
    high?: number;
    latency?: number;
    cost?: number;
    override?: Partial<ModelResult>;
  } = {},
): ModelResult {
  const { base = 50, low = 30, high = 70, latency = 1000, cost = 0.01 } = opts;
  return {
    id,
    displayName: id.toUpperCase(),
    provider: 'test',
    testedAt: '2026-10-20',
    baseline: flat(base),
    steerLow: flat(low),
    steerHigh: flat(high),
    avgLatencyMs: latency,
    avgOutputTokens: 500,
    estimatedRunCostUsd: 1,
    costPer1kOutputTokens: cost,
    samples: emptySamples,
    ...opts.override,
  };
}

function draft(
  overrides: {
    dials?: Partial<AgentDraft['dials']>;
    caps?: Partial<AgentDraft['capabilities']>;
  } = {},
): AgentDraft {
  return {
    ...DEFAULT_DRAFT,
    dials: { ...DEFAULT_DRAFT.dials, ...overrides.dials },
    capabilities: {
      ...DEFAULT_DRAFT.capabilities,
      budget: 'low',
      priority: 100,
      ...overrides.caps,
    },
  };
}

describe('achievableRange', () => {
  it('spans the steer scores and always includes baseline', () => {
    const m = model('a', { base: 80, low: 40, high: 70 });
    expect(achievableRange(m, 'pushback')).toEqual({ low: 40, high: 80 });
  });

  it('handles steering that backfires (steer-high below steer-low)', () => {
    const m = model('a', { base: 50, low: 70, high: 30 });
    expect(achievableRange(m, 'creativity')).toEqual({ low: 30, high: 70 });
  });
});

describe('traitFit', () => {
  const m = model('a', { base: 50, low: 30, high: 70 });

  it('classifies natural, steerable and out-of-reach targets', () => {
    expect(traitFit(m, 'pushback', 55).status).toBe('natural');
    expect(traitFit(m, 'pushback', 68).status).toBe('steerable');
    expect(traitFit(m, 'pushback', 95).status).toBe('out-of-reach');
  });

  it('charges a little inside the range and much more outside it', () => {
    const inside = traitFit(m, 'pushback', 70).penalty; // 20 pts of steering
    const outside = traitFit(m, 'pushback', 90).penalty; // same steering + 20 pts short
    expect(inside).toBeCloseTo(0.04);
    expect(outside).toBeCloseTo(0.24);
  });
});

describe('recommend', () => {
  it('returns [] when there is no model data', () => {
    expect(recommend(draft(), [])).toEqual([]);
  });

  it('returns at most topN, and all models when fewer exist', () => {
    const ms = ['a', 'b', 'c', 'd'].map((id) => model(id));
    expect(recommend(draft(), ms)).toHaveLength(3);
    expect(recommend(draft(), ms.slice(0, 2))).toHaveLength(2);
  });

  it('prefers a model whose range reaches the target over one that falls short', () => {
    const reaches = model('reaches', { base: 50, low: 20, high: 95 });
    const short = model('short', { base: 50, low: 40, high: 60 });
    const [top] = recommend(draft({ dials: { pushback: 90 } }), [short, reaches]);
    expect(top!.modelId).toBe('reaches');
  });

  it('prefers a model that is naturally at the target over one that needs steering', () => {
    const natural = model('natural', { base: 85, low: 60, high: 95 });
    const steered = model('steered', { base: 40, low: 20, high: 95 });
    const recs = recommend(
      draft({ dials: { creativity: 85, pushback: 85, scrutiny: 85, clarification: 85 } }),
      [steered, natural],
    );
    expect(recs.map((r) => r.modelId)).toEqual(['natural', 'steered']);
    expect(recs[0]!.rationale).toMatch(/Already close/);
  });

  it('weights latency only when speed is the priority', () => {
    const fast = model('fast', { latency: 300 });
    const slow = model('slow', { latency: 3000, base: 52 });
    expect(recommend(draft({ caps: { priority: 0 } }), [slow, fast])[0]!.modelId).toBe('fast');
    const depth = recommend(draft({ caps: { priority: 100 } }), [slow, fast]);
    expect(depth[0]!.fitScore).toBe(depth[1]!.fitScore);
  });

  it('weights cost by budget sensitivity', () => {
    const cheap = model('cheap', { cost: 0.001 });
    const pricey = model('pricey', { cost: 0.05 });
    const high = recommend(draft({ caps: { budget: 'high' } }), [pricey, cheap]);
    expect(high[0]!.modelId).toBe('cheap');
    expect(high[0]!.rationale).toMatch(/Lowest output cost/);
    const low = recommend(draft({ caps: { budget: 'low' } }), [pricey, cheap]);
    expect(low[0]!.fitScore).toBe(low[1]!.fitScore);
  });

  it('breaks ties deterministically: cheaper first, then id', () => {
    const recs = recommend(draft(), [model('b'), model('a'), model('c', { cost: 0.001 })]);
    expect(recs.map((r) => r.modelId)).toEqual(['c', 'a', 'b']);
  });

  it('keeps fit scores within 0–100 and explains shortfalls', () => {
    const hopeless = model('hopeless', { base: 0, low: 0, high: 0, latency: 9000, cost: 1 });
    const [r] = recommend(
      draft({
        dials: { creativity: 100, pushback: 100, scrutiny: 100, clarification: 100 },
        caps: { priority: 0, budget: 'high' },
      }),
      [hopeless],
    );
    expect(r!.fitScore).toBeGreaterThanOrEqual(0);
    expect(r!.fitScore).toBeLessThanOrEqual(100);
    expect(r!.rationale).toMatch(/Can't reach your targets on .*tops out at 0, target 100/);
  });

  it('words targets below the range differently from targets above it', () => {
    const intense = model('intense', { base: 80, low: 60, high: 95 });
    const [r] = recommend(draft({ dials: { creativity: 20 } }), [intense]);
    expect(r!.rationale).toMatch(/creativity \(won't go below 60, target 20\)/);
  });

  it('ignores prompt-only dials (formality, verbosity, directness)', () => {
    const ms = [model('a'), model('b', { base: 60 })];
    const a = recommend(draft({ dials: { formality: 0, verbosity: 0, directness: 0 } }), ms);
    const b = recommend(draft({ dials: { formality: 100, verbosity: 100, directness: 100 } }), ms);
    expect(a).toEqual(b);
  });
});
