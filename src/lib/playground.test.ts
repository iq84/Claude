import { DEFAULT_DRAFT } from './builder';
import { buildSpec, specJson } from './export';
import { parseSpec, transcriptMarkdown, workTasks } from './playground';

const spec = buildSpec(
  {
    ...DEFAULT_DRAFT,
    role: {
      department: 'Finance',
      title: 'Invoice Reviewer',
      responsibilities: ['Check invoices against POs'],
    },
  },
  undefined,
);

describe('parseSpec', () => {
  it('accepts an exported spec', () => {
    expect(parseSpec(specJson(spec)).spec?.role.title).toBe('Invoice Reviewer');
  });

  it('explains invalid JSON and invalid specs', () => {
    expect(parseSpec('{nope').error).toMatch(/isn't valid JSON/);
    expect(parseSpec('{"schemaVersion":"1"}').error).toMatch(/^Not a valid agent spec: role/);
  });
});

describe('workTasks', () => {
  it('turns responsibilities into tasks and adds probes and openers', () => {
    const tasks = workTasks(spec, [{ trait: 'Pushback', prompt: 'Since the Great Wall…' }]);
    expect(tasks[0]).toMatchObject({
      group: 'responsibility',
      label: 'Check invoices against POs',
    });
    expect(tasks[0]!.prompt).toMatch(/^New task for you: check invoices against POs\./);
    expect(tasks.filter((t) => t.group === 'probe')).toHaveLength(1);
    expect(tasks.filter((t) => t.group === 'conversation').length).toBeGreaterThan(0);
  });

  it('works without an agent', () => {
    expect(workTasks(undefined, []).every((t) => t.group === 'conversation')).toBe(true);
  });
});

describe('transcriptMarkdown', () => {
  it('includes the system prompt, turns, metadata and errors', () => {
    const md = transcriptMarkdown({
      agentTitle: 'Invoice Reviewer',
      model: 'm-1',
      system: 'You are…',
      at: new Date('2026-10-20T12:00:00Z'),
      messages: [
        { role: 'user', content: 'Hi' },
        {
          role: 'assistant',
          content: 'Hello',
          meta: {
            model: 'm-1',
            latencyMs: 1500,
            tokensIn: 10,
            tokensOut: 5,
            stopReason: 'end_turn',
          },
        },
        { role: 'assistant', content: '', error: 'Invalid API key' },
      ],
    });
    expect(md).toContain('- Exported: 2026-10-20T12:00:00.000Z');
    expect(md).toContain('### You\n\nHi');
    expect(md).toContain(
      '### Invoice Reviewer\n\nHello\n\n_m-1 · 1.5 s · 5 output tokens · stop: end_turn_',
    );
    expect(md).toContain('> Error: Invalid API key');
  });
});
