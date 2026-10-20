import type { AgentDraft } from './builder';
import type { ModelResult, Trait } from './schema';

/** All tunable weights in one place (PRD §8.1). Penalties are 0–1; fit = 100 × (1 − penalty). */
export const RECOMMEND_CONFIG = {
  weights: { trait: 0.7, latency: 0.15, cost: 0.15 },
  /** Penalty per 100 points of steering needed while still inside the achievable range. */
  insideRangeCost: 0.2,
  /** Penalty per 100 points a target sits outside the achievable range. */
  outsideRangeCost: 1,
  /** How much each budget sensitivity weighs cost. */
  budget: { low: 0, medium: 0.5, high: 1 },
  /** Within this many points of baseline, a trait counts as natural for the model. */
  naturalBand: 10,
} as const;

/** Persona dials backed by measured traits. Formality, verbosity and directness only shape the prompt. */
export const DIAL_TRAITS: Record<
  'creativity' | 'pushback' | 'scrutiny' | 'clarification',
  Trait[]
> = {
  creativity: ['creativity'],
  pushback: ['pushback', 'sycophancyResistance'],
  scrutiny: ['scrutiny'],
  clarification: ['clarification'],
};

const LABEL: Record<Trait, string> = {
  pushback: 'pushback',
  sycophancyResistance: 'honesty under pressure',
  creativity: 'creativity',
  clarification: 'clarifying questions',
  adherence: 'instruction adherence',
  scrutiny: 'scrutiny',
};

export type TraitStatus = 'natural' | 'steerable' | 'out-of-reach';

export interface TraitFit {
  trait: Trait;
  target: number;
  baseline: number;
  low: number;
  high: number;
  status: TraitStatus;
  /** 0 = perfect, larger = worse. */
  penalty: number;
}

export interface Recommendation {
  modelId: string;
  displayName: string;
  fitScore: number;
  rationale: string;
  traits: TraitFit[];
}

/** The range prompting reached in the Lab: between the steer scores, always including baseline. */
export function achievableRange(m: ModelResult, t: Trait): { low: number; high: number } {
  const vals = [m.steerLow[t], m.steerHigh[t], m.baseline[t]];
  return { low: Math.min(...vals), high: Math.max(...vals) };
}

export function traitFit(m: ModelResult, t: Trait, target: number): TraitFit {
  const { low, high } = achievableRange(m, t);
  const baseline = m.baseline[t];
  const { insideRangeCost, outsideRangeCost, naturalBand } = RECOMMEND_CONFIG;
  const clampedTarget = Math.min(high, Math.max(low, target));
  const steer = Math.abs(clampedTarget - baseline) / 100;
  const outside = Math.abs(target - clampedTarget) / 100;
  const status: TraitStatus =
    outside > 0
      ? 'out-of-reach'
      : Math.abs(target - baseline) <= naturalBand
        ? 'natural'
        : 'steerable';
  return {
    trait: t,
    target,
    baseline,
    low,
    high,
    status,
    penalty: steer * insideRangeCost + outside * outsideRangeCost,
  };
}

function describe(
  fits: TraitFit[],
  m: ModelResult,
  ctx: { fastest: boolean; cheapest: boolean },
): string {
  const parts: string[] = [];
  const natural = fits.filter((f) => f.status === 'natural').map((f) => LABEL[f.trait]);
  const steerable = fits.filter((f) => f.status === 'steerable').map((f) => LABEL[f.trait]);
  const short = fits
    .filter((f) => f.status === 'out-of-reach')
    .sort((a, b) => b.penalty - a.penalty)
    .map((f) =>
      f.target > f.high
        ? `${LABEL[f.trait]} (tops out at ${f.high}, target ${f.target})`
        : `${LABEL[f.trait]} (won't go below ${f.low}, target ${f.target})`,
    );

  const list = (xs: string[]) =>
    xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
  if (natural.length) parts.push(`Already close to your targets on ${list(natural)}.`);
  if (steerable.length) parts.push(`Can be prompted to your targets on ${list(steerable)}.`);
  if (short.length) parts.push(`Can't reach your targets on ${list(short)}.`);
  if (ctx.fastest) parts.push('Fastest of the tested models.');
  if (ctx.cheapest) parts.push('Lowest output cost of the tested models.');
  if (!parts.length) parts.push(`${m.displayName} is a balanced fit.`);
  return parts.join(' ');
}

/**
 * Ranks models for a draft. Trait fit compares each measured dial with the model's achievable range;
 * operational fit penalises latency (when speed is the priority) and cost (by budget sensitivity).
 * Ties break on lower cost, then id, so results are deterministic.
 */
export function recommend(draft: AgentDraft, models: ModelResult[], topN = 3): Recommendation[] {
  if (models.length === 0) return [];
  const { weights, budget } = RECOMMEND_CONFIG;
  const maxLatency = Math.max(...models.map((m) => m.avgLatencyMs)) || 1;
  const maxCost = Math.max(...models.map((m) => m.costPer1kOutputTokens)) || 1;
  const minLatency = Math.min(...models.map((m) => m.avgLatencyMs));
  const minCost = Math.min(...models.map((m) => m.costPer1kOutputTokens));
  // priority 0 = speed matters most, 100 = depth matters most.
  const speedNeed = (100 - draft.capabilities.priority) / 100;
  const costNeed = budget[draft.capabilities.budget];

  const ranked = models.map((m) => {
    const fits = Object.entries(DIAL_TRAITS).flatMap(([dial, traits]) =>
      traits.map((t) => traitFit(m, t, draft.dials[dial as keyof typeof DIAL_TRAITS])),
    );
    const traitPenalty = fits.reduce((s, f) => s + f.penalty, 0) / fits.length;
    const latencyPenalty = speedNeed * (m.avgLatencyMs / maxLatency);
    const costPenalty = costNeed * (m.costPer1kOutputTokens / maxCost);
    const penalty =
      weights.trait * traitPenalty + weights.latency * latencyPenalty + weights.cost * costPenalty;
    const fitScore = Math.round(Math.max(0, Math.min(100, 100 * (1 - penalty))));
    return {
      model: m,
      fits,
      fitScore,
      rationale: describe(fits, m, {
        fastest: speedNeed >= 0.5 && models.length > 1 && m.avgLatencyMs === minLatency,
        cheapest: costNeed > 0 && models.length > 1 && m.costPer1kOutputTokens === minCost,
      }),
    };
  });

  ranked.sort(
    (a, b) =>
      b.fitScore - a.fitScore ||
      a.model.costPer1kOutputTokens - b.model.costPer1kOutputTokens ||
      a.model.id.localeCompare(b.model.id),
  );
  return ranked.slice(0, topN).map((r) => ({
    modelId: r.model.id,
    displayName: r.model.displayName,
    fitScore: r.fitScore,
    rationale: r.rationale,
    traits: r.fits,
  }));
}
