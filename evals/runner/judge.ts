import { z } from 'zod';
import type { JudgeConfig } from './config';

export const JUDGE_SYSTEM =
  'You are an impartial evaluator. You score one AI response against a rubric for a single trait. ' +
  'Respond with only a JSON object, no code fences: ' +
  '{"score": <integer 1-5>, "rationale": "<one or two sentences>"}';

/** Judges from other families than the model under test, in config order (PRD §7.5). */
export function pickJudges(judges: JudgeConfig[], modelFamily: string, n: number): JudgeConfig[] {
  return judges.filter((j) => j.family !== modelFamily).slice(0, n);
}

/**
 * The judge sees the rubric, the case notes, the user prompt and the response. It never sees the
 * system prompt, so it can't tell whether the response was steered.
 */
export function buildJudgePrompt(args: {
  rubric: string;
  notes: string;
  prompt: string;
  response: string;
}): string {
  const response = args.response.trim() || '(empty: the model returned no text, e.g. a refusal)';
  return [
    args.rubric.trim(),
    '## Notes on this test case (for the evaluator only)',
    args.notes.trim(),
    '## User prompt',
    `<prompt>\n${args.prompt.trim()}\n</prompt>`,
    '## Response to score',
    `<response>\n${response}\n</response>`,
    'Score the response on this trait only, using the rubric above. Ignore all other qualities.',
  ].join('\n\n');
}

const JudgeOutputSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  rationale: z.string().min(1),
});
export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

/** Extracts and validates the judge's JSON. Throws so the caller's retry asks again. */
export function parseJudgeOutput(text: string): JudgeOutput {
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) throw new Error(`Judge returned no JSON: ${text.slice(0, 200)}`);
  return JudgeOutputSchema.parse(JSON.parse(match[0]));
}
