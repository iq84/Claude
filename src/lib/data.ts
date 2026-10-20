import raw from '../data/index.json';
import { PersonalityIndexSchema, type ModelResult, type PersonalityIndex } from './schema';

/** The Personality Index, validated at load so a bad eval build fails loudly rather than rendering junk. */
export const personalityIndex: PersonalityIndex = PersonalityIndexSchema.parse(raw);

export function findModel(id: string | undefined): ModelResult | undefined {
  return personalityIndex.models.find((m) => m.id === id);
}

/** Most recent test date across models (ISO date). */
export function lastTested(index: PersonalityIndex = personalityIndex): string {
  return index.models
    .map((m) => m.testedAt)
    .sort()
    .at(-1)!;
}
