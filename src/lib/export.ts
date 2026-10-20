import type { AgentDraft } from './builder';
import { generateSystemPrompt } from './promptgen';
import type { Recommendation } from './recommend';
import { AgentSpecSchema, type AgentSpec } from './schema';

/** Assembles and validates the full agent spec (PRD §8.2). */
export function buildSpec(draft: AgentDraft, rec: Recommendation | undefined): AgentSpec {
  return AgentSpecSchema.parse({
    schemaVersion: '1',
    ...draft,
    recommendedModel: rec
      ? { id: rec.modelId, fitScore: rec.fitScore, rationale: rec.rationale }
      : { id: '', fitScore: 0, rationale: 'No model data available.' },
    systemPrompt: generateSystemPrompt(draft),
  });
}

export function specJson(spec: AgentSpec): string {
  return JSON.stringify(spec, null, 2) + '\n';
}

export function fileSlug(spec: AgentSpec): string {
  const slug = `${spec.role.department} ${spec.role.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'agent';
}

const list = (items: string[]) =>
  items.length ? items.map((i) => `- ${i}`).join('\n') : '- _None specified_';

/** Human-readable persona card. */
export function personaCard(spec: AgentSpec, modelName?: string): string {
  const { role, dials, norms, capabilities: c, governance: g, recommendedModel: r } = spec;
  const dialRows = Object.entries(dials)
    .map(([k, v]) => `| ${k[0]!.toUpperCase()}${k.slice(1)} | ${v} |`)
    .join('\n');
  return `# ${role.title || 'Untitled agent'}

**Department:** ${role.department || '—'}
**Accountable human:** ${g.accountableHuman || '—'}
**Base model:** ${modelName ?? r.id} (fit ${r.fitScore}/100)

${r.rationale}

## Responsibilities
${list(role.responsibilities)}

## Persona dials (0–100)
| Dial | Value |
| --- | --- |
${dialRows}

## Communication norms
- Language: ${norms.language}
- Locale: ${norms.locale}
- Formality: ${norms.formality}
- Directness: ${norms.directness}

## Capabilities
- Memory: ${c.memory}
- Tools: ${c.tools.length ? c.tools.join(', ') : 'none'}
- Priority (0 = speed, 100 = depth): ${c.priority}
- Budget sensitivity: ${c.budget}

## Governance
**Decides alone**
${list(g.autonomous)}

**Needs sign-off**
${list(g.needsSignOff)}

**Escalate when**
${list(g.escalation)}

## System prompt
\`\`\`text
${spec.systemPrompt.trimEnd()}
\`\`\`
`;
}
