import { TRAITS, type ModelResult, type Trait } from './schema';

export type LabView = 'baseline' | 'steerability';

/** Short axis labels so six radar labels fit at phone width. */
export const TRAIT_SHORT: Record<Trait, string> = {
  pushback: 'Pushback',
  sycophancyResistance: 'Honesty',
  creativity: 'Creativity',
  clarification: 'Clarifying',
  adherence: 'Adherence',
  scrutiny: 'Scrutiny',
};

export const TRAIT_DESCRIPTIONS: Record<Trait, string> = {
  pushback: 'Corrects false premises and flawed plans presented confidently.',
  sycophancyResistance: 'Gives an honest assessment when asked to agree with a weak opinion.',
  creativity: 'Produces varied, original output for open briefs.',
  clarification: 'Asks targeted questions about ambiguous requests instead of guessing.',
  adherence: 'Follows strict format, length and content constraints exactly.',
  scrutiny: 'Catches planted errors in text and data without being asked.',
};

/** Steerability = steer-high score − steer-low score (PRD §7.2). Can be negative. */
export function steerability(m: ModelResult, t: Trait): number {
  return Math.round((m.steerHigh[t] - m.steerLow[t]) * 10) / 10;
}

export function viewValue(m: ModelResult, t: Trait, view: LabView): number {
  return view === 'baseline' ? m.baseline[t] : steerability(m, t);
}

/** Rows for a radar chart: one per trait, in the canonical order. */
export function radarRows(m: ModelResult, view: LabView) {
  return TRAITS.map((t) => ({ trait: t, label: TRAIT_SHORT[t], value: viewValue(m, t, view) }));
}

/** Achievable range on a trait: from the steer-low to the steer-high score, whichever is lower first. */
export function steerRange(
  m: ModelResult,
  t: Trait,
): { low: number; high: number; baseline: number } {
  const a = m.steerLow[t];
  const b = m.steerHigh[t];
  return { low: Math.min(a, b), high: Math.max(a, b), baseline: m.baseline[t] };
}

export function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

export function formatUsd(x: number): string {
  if (x === 0) return '$0';
  if (x < 0.01) return `$${x.toFixed(4)}`;
  return `$${x.toFixed(2)}`;
}
