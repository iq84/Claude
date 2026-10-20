import { parse } from 'yaml';
import { TRAIT_LABELS, type Trait } from '../lib/schema';

// The same prompts the Lab measures with, so you can see how *your* persona handles them.
const files = import.meta.glob('../../evals/suites/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const PROBES: { trait: string; prompt: string }[] = Object.values(files).flatMap((raw) => {
  const suite = parse(raw as string) as { trait: Trait; cases: { prompt: string }[] };
  const first = suite.cases[0];
  return first ? [{ trait: TRAIT_LABELS[suite.trait] ?? suite.trait, prompt: first.prompt }] : [];
});
