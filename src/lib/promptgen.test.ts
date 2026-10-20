import { DEFAULT_DRAFT, level, type AgentDraft } from './builder';
import { DIAL_TEXT, generateSystemPrompt } from './promptgen';

const draft: AgentDraft = {
  ...DEFAULT_DRAFT,
  role: {
    department: 'Finance',
    title: 'Invoice Reviewer',
    responsibilities: ['Check invoices against POs'],
  },
  dials: { ...DEFAULT_DRAFT.dials, pushback: 90, scrutiny: 95, clarification: 10, verbosity: 20 },
  capabilities: { memory: 'none', tools: ['Spreadsheets'], priority: 80, budget: 'high' },
  governance: {
    autonomous: ['Flag mismatched invoices'],
    needsSignOff: ['Approving payments'],
    escalation: ['Suspected fraud'],
    accountableHuman: 'Finance Manager',
  },
};

describe('level', () => {
  it('buckets dials into low / medium / high', () => {
    expect([0, 33, 34, 66, 67, 100].map(level)).toEqual([
      'low',
      'low',
      'medium',
      'medium',
      'high',
      'high',
    ]);
  });
});

describe('generateSystemPrompt', () => {
  const p = generateSystemPrompt(draft);

  it('introduces the role, team and accountable human', () => {
    expect(p).toMatch(
      /^You are Invoice Reviewer, an AI agent on the Finance team\. You work for Finance Manager/,
    );
  });

  it('uses the calibrated text for each dial level', () => {
    expect(p).toContain(DIAL_TEXT.pushback.high);
    expect(p).toContain(DIAL_TEXT.scrutiny.high);
    expect(p).toContain(DIAL_TEXT.clarification.low);
    expect(p).toContain(DIAL_TEXT.verbosity.low);
    expect(p).toContain(DIAL_TEXT.creativity.medium);
  });

  it('includes capabilities and decision rights', () => {
    expect(p).toContain('You have no memory between conversations');
    expect(p).toContain('You can use: Spreadsheets');
    expect(p).toContain('Favour depth');
    expect(p).toContain('Cost matters');
    expect(p).toContain('Get sign-off from Finance Manager before:\n- Approving payments');
    expect(p).toContain('escalate to Finance Manager immediately when:\n- Suspected fraud');
  });

  it('falls back gracefully on an empty draft', () => {
    const empty = generateSystemPrompt(DEFAULT_DRAFT);
    expect(empty).toMatch(/^You are an AI agent\. You work for your human manager/);
    expect(empty).not.toContain('## Responsibilities');
    expect(empty).toContain('You have no tools');
  });

  it('is deterministic', () => {
    expect(generateSystemPrompt(draft)).toBe(p);
  });
});
