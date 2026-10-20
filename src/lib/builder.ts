import type { AgentSpec } from './schema';

/** Everything the wizard collects; the recommendation and system prompt are derived from it. */
export type AgentDraft = Omit<AgentSpec, 'schemaVersion' | 'recommendedModel' | 'systemPrompt'>;
export type Dials = AgentDraft['dials'];
export type DialKey = keyof Dials;

export const DEPARTMENTS = [
  'Marketing',
  'Sales',
  'Customer Support',
  'Finance',
  'HR',
  'Legal',
  'Engineering',
  'Product',
  'Operations',
  'Research',
];

export const TOOL_OPTIONS = [
  'Web search',
  'Email (draft only)',
  'Email (send)',
  'Calendar',
  'CRM',
  'Document storage',
  'Spreadsheets',
  'Code execution',
  'Ticketing system',
  'Internal knowledge base',
];

export const DIALS: {
  key: DialKey;
  label: string;
  low: string;
  high: string;
  measured: boolean;
}[] = [
  {
    key: 'creativity',
    label: 'Creativity',
    low: 'Conventional',
    high: 'Inventive',
    measured: true,
  },
  { key: 'pushback', label: 'Pushback', low: 'Goes along', high: 'Challenges', measured: true },
  {
    key: 'scrutiny',
    label: 'Scrutiny',
    low: 'Trusting',
    high: 'Checks everything',
    measured: true,
  },
  {
    key: 'clarification',
    label: 'Clarification',
    low: 'Assumes',
    high: 'Asks first',
    measured: true,
  },
  { key: 'formality', label: 'Formality', low: 'Casual', high: 'Formal', measured: false },
  { key: 'verbosity', label: 'Verbosity', low: 'Brief', high: 'Thorough', measured: false },
  { key: 'directness', label: 'Directness', low: 'Diplomatic', high: 'Blunt', measured: false },
];

export const DEFAULT_DRAFT: AgentDraft = {
  role: { department: '', title: '', responsibilities: [] },
  dials: {
    creativity: 50,
    pushback: 50,
    scrutiny: 50,
    clarification: 50,
    formality: 50,
    verbosity: 50,
    directness: 50,
  },
  norms: { language: 'English', locale: 'en-US', formality: 'neutral', directness: 'balanced' },
  capabilities: { memory: 'session', tools: [], priority: 50, budget: 'medium' },
  governance: { autonomous: [], needsSignOff: [], escalation: [], accountableHuman: '' },
};

export type Level = 'low' | 'medium' | 'high';

/** Buckets a 0–100 dial into the three calibrated prompt levels. */
export function level(value: number): Level {
  if (value < 34) return 'low';
  if (value < 67) return 'medium';
  return 'high';
}

/** Splits a textarea's lines into a clean list. */
export function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
