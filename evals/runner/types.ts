import type { Trait } from '../../src/lib/schema';

export const CONDITIONS = ['baseline', 'steerHigh', 'steerLow'] as const;
export type Condition = (typeof CONDITIONS)[number];

/** The single interface every provider adapter implements (PRD §7.4). */
export interface CompleteRequest {
  model: string;
  system: string;
  prompt: string;
  /** null/undefined = don't send; some models reject custom sampling. */
  temperature?: number | null;
  maxTokens: number;
  /** Anthropic only: fixed reasoning effort. */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

export interface CompleteResult {
  text: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  /** Provider's stop/finish reason, e.g. "end_turn", "refusal", "max_tokens". */
  stopReason?: string;
}

export type Complete = (req: CompleteRequest) => Promise<CompleteResult>;

export interface ResponseRecord extends CompleteResult {
  key: string;
  modelId: string;
  trait: Trait;
  caseId: string;
  condition: Condition;
  rep: number;
  at: string;
}

export interface JudgmentRecord {
  key: string;
  responseKey: string;
  judgeId: string;
  /** Raw judge score, 1–5. */
  score: number;
  rationale: string;
  tokensIn: number;
  tokensOut: number;
  at: string;
}

export function responseKey(r: {
  modelId: string;
  trait: Trait;
  caseId: string;
  condition: Condition;
  rep: number;
}): string {
  return `${r.modelId}|${r.trait}|${r.caseId}|${r.condition}|${r.rep}`;
}

export function judgmentKey(responseKeyValue: string, judgeId: string): string {
  return `${responseKeyValue}|${judgeId}`;
}
