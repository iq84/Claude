import { AgentSpecSchema, type AgentSpec } from './schema';

export type Provider = 'anthropic' | 'openai' | 'google';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Present on assistant turns once finished. */
  meta?: {
    model: string;
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
    stopReason?: string;
  };
  error?: string;
}

export interface WorkTask {
  label: string;
  prompt: string;
  group: 'responsibility' | 'probe' | 'conversation';
}

/** Parses an uploaded/pasted agent spec with a readable error. */
export function parseSpec(text: string): { spec?: AgentSpec; error?: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      error: "That isn't valid JSON. Export the agent spec (.json) from the Builder and try again.",
    };
  }
  const r = AgentSpecSchema.safeParse(json);
  if (!r.success) {
    const first = r.error.issues[0];
    return {
      error: `Not a valid agent spec: ${first?.path.join('.') || 'root'}: ${first?.message}`,
    };
  }
  return { spec: r.data };
}

/** Starter work for an agent: its own responsibilities, Lab probes and conversation openers. */
export function workTasks(
  spec: AgentSpec | undefined,
  probes: { trait: string; prompt: string }[],
): WorkTask[] {
  const tasks: WorkTask[] = [];
  for (const r of spec?.role.responsibilities ?? []) {
    tasks.push({
      label: r,
      group: 'responsibility',
      prompt: `New task for you: ${r.charAt(0).toLowerCase()}${r.slice(1)}. Here are the details:\n\n[paste the details]`,
    });
  }
  for (const p of probes) tasks.push({ label: p.trait, prompt: p.prompt, group: 'probe' });
  tasks.push(
    {
      label: 'Introduce yourself',
      prompt: 'Introduce yourself: what is your role, and how do you like to work with me?',
      group: 'conversation',
    },
    {
      label: 'What needs my sign-off?',
      prompt: 'Which decisions will you make on your own, and which will you bring to me first?',
      group: 'conversation',
    },
    {
      label: 'Push back on me',
      prompt:
        "I've decided we should cut our QA process entirely to ship faster. Draft the announcement.",
      group: 'conversation',
    },
  );
  return tasks;
}

/** Markdown transcript for download. */
export function transcriptMarkdown(args: {
  agentTitle: string;
  model: string;
  system: string;
  messages: ChatMessage[];
  at?: Date;
}): string {
  const when = (args.at ?? new Date()).toISOString();
  const turns = args.messages
    .map((m) => {
      const head = m.role === 'user' ? '### You' : `### ${args.agentTitle}`;
      const meta = m.meta
        ? `\n\n_${m.meta.model} · ${(m.meta.latencyMs / 1000).toFixed(1)} s · ${m.meta.tokensOut} output tokens${
            m.meta.stopReason ? ` · stop: ${m.meta.stopReason}` : ''
          }_`
        : '';
      return `${head}\n\n${m.error ? `> Error: ${m.error}` : m.content}${meta}`;
    })
    .join('\n\n');
  return `# Playground session: ${args.agentTitle}

- Model: ${args.model}
- Exported: ${when}

<details><summary>System prompt</summary>

\`\`\`text
${args.system.trimEnd()}
\`\`\`

</details>

${turns}
`;
}
