import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { TraitSchema, type Trait } from '../../src/lib/schema';

export const EVALS_DIR = path.resolve(import.meta.dirname, '..');
export const ROOT_DIR = path.resolve(EVALS_DIR, '..');
export const PLACEHOLDER = 'REPLACE_ME';

const ProviderSchema = z.enum(['anthropic', 'openai', 'google']);
const EffortSchema = z.enum(['low', 'medium', 'high', 'xhigh', 'max']);
const PriceSchema = z.object({ input: z.number().nonnegative(), output: z.number().nonnegative() });

const EndpointFields = {
  family: z.string().min(1),
  provider: ProviderSchema,
  apiModel: z.string().min(1),
  pricePer1M: PriceSchema,
  temperature: z.number().min(0).max(2).nullable().optional(),
  effort: EffortSchema.optional(),
};

export const ModelConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be a lowercase slug'),
  displayName: z.string().min(1),
  ...EndpointFields,
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

export const ModelsFileSchema = z.object({
  defaults: z.object({
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().positive(),
    baselineSystem: z.string().min(1),
  }),
  models: z.array(ModelConfigSchema).min(1),
});
export type ModelsFile = z.infer<typeof ModelsFileSchema>;

export const JudgeConfigSchema = z.object({ id: z.string().min(1), ...EndpointFields });
export type JudgeConfig = z.infer<typeof JudgeConfigSchema>;

export const JudgeFileSchema = z.object({
  perResponse: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  judges: z.array(JudgeConfigSchema).min(1),
});
export type JudgeFile = z.infer<typeof JudgeFileSchema>;

export const SuiteSchema = z.object({
  trait: TraitSchema,
  steer: z.object({ high: z.string().min(1), low: z.string().min(1) }),
  cases: z
    .array(z.object({ id: z.string().min(1), prompt: z.string().min(1), notes: z.string().min(1) }))
    .min(1),
});
export type Suite = z.infer<typeof SuiteSchema>;

function readYaml<T>(file: string, schema: z.ZodType<T>): T {
  const result = schema.safeParse(parse(readFileSync(file, 'utf8')));
  if (!result.success) {
    throw new Error(`Invalid ${path.relative(ROOT_DIR, file)}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export interface EvalConfig {
  models: ModelsFile;
  judge: JudgeFile;
  suites: Suite[];
  rubrics: Record<Trait, string>;
}

export function loadConfig(evalsDir = EVALS_DIR): EvalConfig {
  const models = readYaml(path.join(evalsDir, 'config/models.yaml'), ModelsFileSchema);
  const judge = readYaml(path.join(evalsDir, 'config/judge.yaml'), JudgeFileSchema);
  const suiteDir = path.join(evalsDir, 'suites');
  const suites = readdirSync(suiteDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => readYaml(path.join(suiteDir, f), SuiteSchema));

  const rubrics = {} as Record<Trait, string>;
  for (const s of suites) {
    rubrics[s.trait] = readFileSync(path.join(evalsDir, 'rubrics', `${s.trait}.md`), 'utf8');
  }
  validateConfig({ models, judge, suites, rubrics });
  return { models, judge, suites, rubrics };
}

/** Cross-file checks that a schema can't express. */
export function validateConfig(cfg: EvalConfig): void {
  const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  const problems: string[] = [];
  for (const d of dupes(cfg.models.models.map((m) => m.id)))
    problems.push(`duplicate model id ${d}`);
  for (const d of dupes(cfg.judge.judges.map((j) => j.id)))
    problems.push(`duplicate judge id ${d}`);
  for (const d of dupes(cfg.suites.map((s) => s.trait))) problems.push(`duplicate suite ${d}`);
  for (const d of dupes(cfg.suites.flatMap((s) => s.cases.map((c) => c.id))))
    problems.push(`duplicate case id ${d}`);
  for (const m of cfg.models.models) {
    const eligible = cfg.judge.judges.filter((j) => j.family !== m.family).length;
    if (eligible < cfg.judge.perResponse) {
      problems.push(
        `model ${m.id} (family ${m.family}) has ${eligible} judges from other families; ` +
          `judge.yaml perResponse needs ${cfg.judge.perResponse}`,
      );
    }
  }
  if (problems.length) throw new Error(`Eval config problems:\n- ${problems.join('\n- ')}`);
}

/** Fails before any API call if a model or judge we're about to use still has a placeholder ID. */
export function assertNoPlaceholders(endpoints: { id: string; apiModel: string }[]): void {
  const missing = endpoints.filter((e) => e.apiModel === PLACEHOLDER).map((e) => e.id);
  if (missing.length) {
    throw new Error(
      `Fill in apiModel in evals/config/*.yaml for: ${missing.join(', ')} ` +
        `(or run with --mock to test the pipeline).`,
    );
  }
}
