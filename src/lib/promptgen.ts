import { level, type AgentDraft, type DialKey, type Level } from './builder';

/** Calibrated instruction text per dial and level (PRD §8.2). */
export const DIAL_TEXT: Record<DialKey, Record<Level, string>> = {
  creativity: {
    low: 'Stick to proven, conventional approaches. Prefer the standard answer over a novel one.',
    medium:
      'Use established approaches by default, and suggest a fresh idea when it clearly helps.',
    high: 'Look for original, unexpected ideas. Offer several distinct options and avoid cliches.',
  },
  pushback: {
    low: 'Follow requests as given. Raise a concern only if something is clearly unsafe or illegal.',
    medium:
      'If a request rests on a mistaken assumption or a weak plan, say so briefly, then help.',
    high: 'Challenge flawed premises and weak plans directly before doing the work. Never agree just to please; give your honest assessment.',
  },
  scrutiny: {
    low: 'Trust the information you are given unless an error is obvious.',
    medium: 'Sanity-check key facts, figures and dates, and flag anything that looks wrong.',
    high: 'Check every fact, number, date and calculation you are given or produce. Point out errors even when nobody asked.',
  },
  clarification: {
    low: 'Do not ask clarifying questions. Make sensible assumptions, state them briefly, and complete the task.',
    medium:
      'If a request is missing something important, ask one or two targeted questions; otherwise state your assumptions and proceed.',
    high: 'When a request is ambiguous or missing key details, ask targeted clarifying questions before producing anything.',
  },
  formality: {
    low: 'Write in a relaxed, conversational tone.',
    medium: 'Write in a professional but approachable tone.',
    high: 'Write in a formal, polished business tone.',
  },
  verbosity: {
    low: 'Keep responses short: lead with the answer and cut anything non-essential.',
    medium: 'Give complete answers without padding.',
    high: 'Be thorough: explain your reasoning, cover edge cases and include supporting detail.',
  },
  directness: {
    low: 'Deliver difficult messages diplomatically, softening criticism and framing it constructively.',
    medium: 'Be clear and honest while staying tactful.',
    high: 'Be blunt and direct. State conclusions and problems plainly without hedging.',
  },
};

const MEMORY_TEXT: Record<AgentDraft['capabilities']['memory'], string> = {
  none: 'You have no memory between conversations. Ask for any background you need.',
  session: 'You remember context within the current conversation only.',
  'long-term':
    'You have long-term memory. Record decisions, preferences and open items so you can pick up where you left off.',
};

const BUDGET_TEXT: Record<AgentDraft['capabilities']['budget'], string> = {
  low: '',
  medium: 'Be mindful of cost: avoid unnecessary tool calls and overly long outputs.',
  high: 'Cost matters: use the fewest tool calls and the shortest output that does the job well.',
};

function priorityText(priority: number): string {
  const l = level(priority);
  if (l === 'low') return 'Favour speed: give a good answer quickly rather than an exhaustive one.';
  if (l === 'high') return 'Favour depth: take the time to get things right, even if it is slower.';
  return 'Balance speed and depth according to what the task needs.';
}

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

/** Builds the agent's system prompt from a draft. Pure and deterministic. */
export function generateSystemPrompt(d: AgentDraft): string {
  const human = d.governance.accountableHuman.trim() || 'your human manager';
  const title = d.role.title.trim() || 'an AI agent';
  const dept = d.role.department.trim();
  const sections: string[] = [];

  sections.push(
    `You are ${title}${dept ? `, an AI agent on the ${dept} team` : ''}. ` +
      `You work for ${human}, who is accountable for your work.`,
  );

  if (d.role.responsibilities.length) {
    sections.push(`## Responsibilities\n${bullets(d.role.responsibilities)}`);
  }

  const order: DialKey[] = [
    'pushback',
    'scrutiny',
    'clarification',
    'creativity',
    'directness',
    'formality',
    'verbosity',
  ];
  sections.push(`## How you work\n${bullets(order.map((k) => DIAL_TEXT[k][level(d.dials[k])]))}`);

  const n = d.norms;
  sections.push(
    `## Communication norms\n` +
      bullets([
        `Write in ${n.language || 'English'}, following ${n.locale || 'local'} conventions for dates, numbers and spelling.`,
        `Your audience expects a ${n.formality} register and ${n.directness} feedback; adapt your wording to that.`,
      ]),
  );

  const caps = [
    MEMORY_TEXT[d.capabilities.memory],
    d.capabilities.tools.length
      ? `You can use: ${d.capabilities.tools.join(', ')}. Use only these tools.`
      : 'You have no tools. If a task needs one, say what you would need.',
    priorityText(d.capabilities.priority),
    BUDGET_TEXT[d.capabilities.budget],
  ].filter(Boolean);
  sections.push(`## Capabilities\n${bullets(caps)}`);

  const g = d.governance;
  const gov: string[] = [];
  if (g.autonomous.length) gov.push(`You may decide on your own:\n${bullets(g.autonomous)}`);
  if (g.needsSignOff.length)
    gov.push(`Get sign-off from ${human} before:\n${bullets(g.needsSignOff)}`);
  if (g.escalation.length)
    gov.push(`Stop and escalate to ${human} immediately when:\n${bullets(g.escalation)}`);
  gov.push(`If you are unsure whether something needs approval, ask ${human}.`);
  sections.push(`## Decision rights\n${gov.join('\n\n')}`);

  return sections.join('\n\n') + '\n';
}
