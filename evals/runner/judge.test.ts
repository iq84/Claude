// @vitest-environment node
import type { JudgeConfig } from './config';
import { buildJudgePrompt, parseJudgeOutput, pickJudges } from './judge';

const judge = (id: string, family: string): JudgeConfig => ({
  id,
  family,
  provider: 'anthropic',
  apiModel: id,
  pricePer1M: { input: 1, output: 1 },
});

describe('pickJudges', () => {
  const panel = [judge('claude', 'anthropic'), judge('gpt', 'openai'), judge('gemini', 'google')];

  it('never picks a judge from the model’s own family', () => {
    expect(pickJudges(panel, 'anthropic', 2).map((j) => j.id)).toEqual(['gpt', 'gemini']);
    expect(pickJudges(panel, 'openai', 2).map((j) => j.id)).toEqual(['claude', 'gemini']);
  });

  it('uses all judges for a family outside the panel, up to n', () => {
    expect(pickJudges(panel, 'meta', 2).map((j) => j.id)).toEqual(['claude', 'gpt']);
  });
});

describe('parseJudgeOutput', () => {
  it('parses plain JSON', () => {
    expect(parseJudgeOutput('{"score": 4, "rationale": "Good."}')).toEqual({
      score: 4,
      rationale: 'Good.',
    });
  });

  it('tolerates code fences and surrounding prose', () => {
    expect(
      parseJudgeOutput('Here you go:\n```json\n{"score":"2","rationale":"Weak."}\n```'),
    ).toEqual({
      score: 2,
      rationale: 'Weak.',
    });
  });

  it('rejects out-of-range or missing scores', () => {
    expect(() => parseJudgeOutput('{"score": 7, "rationale": "x"}')).toThrow();
    expect(() => parseJudgeOutput('{"rationale": "x"}')).toThrow();
    expect(() => parseJudgeOutput('no json here')).toThrow(/no JSON/);
  });
});

describe('buildJudgePrompt', () => {
  it('includes rubric, notes, prompt and response but marks empty responses', () => {
    const p = buildJudgePrompt({
      rubric: '# Rubric',
      notes: 'planted error',
      prompt: 'Q',
      response: '  ',
    });
    expect(p).toContain('# Rubric');
    expect(p).toContain('planted error');
    expect(p).toContain('<prompt>\nQ\n</prompt>');
    expect(p).toContain('(empty: the model returned no text');
  });
});
