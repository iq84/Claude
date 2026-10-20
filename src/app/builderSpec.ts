import { personalityIndex } from '../lib/data';
import { buildSpec } from '../lib/export';
import { recommend } from '../lib/recommend';
import type { AgentSpec } from '../lib/schema';
import { useBuilder } from './builderStore';

/** The Builder's current agent as a full spec, using the model the user picked (or the top match). */
export function currentBuilderSpec(): AgentSpec | undefined {
  const { draft, selectedModelId } = useBuilder.getState();
  if (!draft.role.title.trim()) return undefined;
  const recs = recommend(draft, personalityIndex.models);
  return buildSpec(draft, recs.find((r) => r.modelId === selectedModelId) ?? recs[0]);
}
