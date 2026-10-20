import type { Suite } from '../config';
import type { Complete } from '../types';

export const MOCK_JUDGE_MARKER = 'You are an impartial evaluator';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 2 ** 32;
}

/**
 * Deterministic fake provider for testing the pipeline without API keys or cost.
 * Model calls embed a fake score that responds to steering; judge calls read it back.
 */
export function createMock(suites: Suite[]): Complete {
  const level = new Map<string, number>();
  for (const s of suites) {
    level.set(s.steer.high, 1.2);
    level.set(s.steer.low, -1.2);
  }
  return async ({ model, system, prompt }) => {
    if (system.startsWith(MOCK_JUDGE_MARKER)) {
      const m = /mock-score=(\d(?:\.\d+)?)/.exec(prompt);
      const base = m ? Number(m[1]) : 3;
      const score = Math.min(5, Math.max(1, Math.round(base + (hash(model + prompt) - 0.5))));
      return {
        text: JSON.stringify({ score, rationale: `Mock judgment by ${model}.` }),
        latencyMs: 5,
        tokensIn: 900,
        tokensOut: 60,
      };
    }
    const base = 2 + hash(model + prompt.slice(0, 20)) * 2;
    const score = Math.min(5, Math.max(1, base + (level.get(system) ?? 0)));
    return {
      text: `[Mock response from ${model}] mock-score=${score.toFixed(2)}`,
      latencyMs: Math.round(400 + hash(model) * 1600),
      tokensIn: 120,
      tokensOut: Math.round(200 + hash(model + prompt) * 400),
      stopReason: 'end_turn',
    };
  };
}
