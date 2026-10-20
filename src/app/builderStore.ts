import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { DEFAULT_DRAFT, type AgentDraft } from '../lib/builder';

/** localStorage that never throws (private mode, blocked storage, quota): the wizard just won't persist. */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // ignore
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};

export const STEPS = [
  'Role',
  'Persona',
  'Norms',
  'Capabilities',
  'Governance',
  'Model & export',
] as const;

interface BuilderState {
  step: number;
  draft: AgentDraft;
  /** Model the user picked on the review step; undefined = top recommendation. */
  selectedModelId?: string;
  setStep: (step: number) => void;
  update: (fn: (d: AgentDraft) => AgentDraft) => void;
  selectModel: (id: string) => void;
  reset: () => void;
}

export const useBuilder = create<BuilderState>()(
  persist(
    (set) => ({
      step: 0,
      draft: DEFAULT_DRAFT,
      selectedModelId: undefined,
      setStep: (step) => set({ step: Math.max(0, Math.min(STEPS.length - 1, step)) }),
      update: (fn) => set((s) => ({ draft: fn(s.draft) })),
      selectModel: (id) => set({ selectedModelId: id }),
      reset: () => set({ step: 0, draft: DEFAULT_DRAFT, selectedModelId: undefined }),
    }),
    {
      name: 'agent-builder',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // Fill in any fields added since the draft was saved.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BuilderState>;
        const d = p.draft;
        return {
          ...current,
          ...p,
          draft: d
            ? {
                role: { ...DEFAULT_DRAFT.role, ...d.role },
                dials: { ...DEFAULT_DRAFT.dials, ...d.dials },
                norms: { ...DEFAULT_DRAFT.norms, ...d.norms },
                capabilities: { ...DEFAULT_DRAFT.capabilities, ...d.capabilities },
                governance: { ...DEFAULT_DRAFT.governance, ...d.governance },
              }
            : current.draft,
        };
      },
    },
  ),
);

/** Step-level validation; returns an error message or null. */
export function validateStep(step: number, d: AgentDraft): string | null {
  if (step === 0) {
    if (!d.role.department.trim()) return 'Choose or enter a department.';
    if (!d.role.title.trim()) return 'Enter a role title.';
  }
  if (step === 4 && !d.governance.accountableHuman.trim()) {
    return 'Name the accountable human (a role is fine, e.g. "Head of Support").';
  }
  return null;
}
