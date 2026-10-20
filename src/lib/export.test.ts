import { DEFAULT_DRAFT } from './builder';
import { buildSpec, fileSlug, personaCard, specJson } from './export';
import { AgentSpecSchema } from './schema';

const draft = {
  ...DEFAULT_DRAFT,
  role: {
    department: 'Customer Support',
    title: 'Tier-1 Agent',
    responsibilities: ['Answer tickets'],
  },
};
const rec = {
  modelId: 'm1',
  displayName: 'Model One',
  fitScore: 87,
  rationale: 'Good fit.',
  traits: [],
};

describe('hiring packet export', () => {
  it('builds a valid spec with schemaVersion, model and system prompt', () => {
    const spec = buildSpec(draft, rec);
    expect(AgentSpecSchema.parse(JSON.parse(specJson(spec)))).toEqual(spec);
    expect(spec.schemaVersion).toBe('1');
    expect(spec.recommendedModel).toEqual({ id: 'm1', fitScore: 87, rationale: 'Good fit.' });
    expect(spec.systemPrompt).toContain('Tier-1 Agent');
  });

  it('still produces a valid spec without a recommendation', () => {
    expect(buildSpec(draft, undefined).recommendedModel.id).toBe('');
  });

  it('makes a safe file name', () => {
    expect(fileSlug(buildSpec(draft, rec))).toBe('customer-support-tier-1-agent');
    expect(fileSlug(buildSpec(DEFAULT_DRAFT, rec))).toBe('agent');
  });

  it('renders a persona card with every section and the prompt', () => {
    const md = personaCard(buildSpec(draft, rec), 'Model One');
    for (const h of [
      '# Tier-1 Agent',
      '## Responsibilities',
      '## Persona dials',
      '## Communication norms',
      '## Capabilities',
      '## Governance',
      '## System prompt',
    ]) {
      expect(md).toContain(h);
    }
    expect(md).toContain('**Base model:** Model One (fit 87/100)');
    expect(md).toContain('- Answer tickets');
  });
});
