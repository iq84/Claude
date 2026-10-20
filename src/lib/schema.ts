import { z } from 'zod';

// Shared, framework-agnostic schemas (PRD §10). Used by the site and the eval runner.

export const TRAITS = [
  'pushback',
  'sycophancyResistance',
  'creativity',
  'clarification',
  'adherence',
  'scrutiny',
] as const;

export const TraitSchema = z.enum(TRAITS);
export type Trait = z.infer<typeof TraitSchema>;

export const TRAIT_LABELS: Record<Trait, string> = {
  pushback: 'Pushback',
  sycophancyResistance: 'Sycophancy resistance',
  creativity: 'Creativity',
  clarification: 'Clarification',
  adherence: 'Instruction adherence',
  scrutiny: 'Scrutiny',
};

const score100 = z.number().min(0).max(100);
const traitScores = z.object(
  Object.fromEntries(TRAITS.map((t) => [t, score100])) as Record<Trait, typeof score100>,
);

export const SampleSchema = z.object({
  prompt: z.string(),
  response: z.string(),
  score: score100,
});
export type Sample = z.infer<typeof SampleSchema>;

export const ModelResultSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1),
  testedAt: z.iso.date(),
  baseline: traitScores,
  steerHigh: traitScores,
  steerLow: traitScores,
  avgLatencyMs: z.number().nonnegative(),
  avgOutputTokens: z.number().nonnegative(),
  estimatedRunCostUsd: z.number().nonnegative(),
  costPer1kOutputTokens: z.number().nonnegative(),
  samples: z.object(
    Object.fromEntries(TRAITS.map((t) => [t, z.array(SampleSchema)])) as Record<
      Trait,
      z.ZodArray<typeof SampleSchema>
    >,
  ),
});
export type ModelResult = z.infer<typeof ModelResultSchema>;

export const PersonalityIndexSchema = z.object({
  version: z.string(),
  generatedAt: z.iso.datetime(),
  /** True when the data is placeholder/mock output, not a real eval run. The UI must label it. */
  sample: z.boolean().default(false),
  judge: z.string(),
  reps: z.number().int().positive(),
  models: z.array(ModelResultSchema).min(1),
});
export type PersonalityIndex = z.infer<typeof PersonalityIndexSchema>;

const dial = z.number().min(0).max(100);

export const AgentSpecSchema = z.object({
  schemaVersion: z.literal('1'),
  role: z.object({
    department: z.string(),
    title: z.string(),
    responsibilities: z.array(z.string()),
  }),
  dials: z.object({
    creativity: dial,
    pushback: dial,
    scrutiny: dial,
    clarification: dial,
    formality: dial,
    verbosity: dial,
    directness: dial,
  }),
  norms: z.object({
    language: z.string(),
    locale: z.string(),
    formality: z.string(),
    directness: z.string(),
  }),
  capabilities: z.object({
    memory: z.enum(['none', 'session', 'long-term']),
    tools: z.array(z.string()),
    priority: dial,
    budget: z.enum(['low', 'medium', 'high']),
  }),
  governance: z.object({
    autonomous: z.array(z.string()),
    needsSignOff: z.array(z.string()),
    escalation: z.array(z.string()),
    accountableHuman: z.string(),
  }),
  recommendedModel: z.object({
    id: z.string(),
    fitScore: z.number(),
    rationale: z.string(),
  }),
  systemPrompt: z.string(),
});
export type AgentSpec = z.infer<typeof AgentSpecSchema>;
