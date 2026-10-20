import { useState } from 'react';
import { useBuilder } from '../../app/builderStore';
import { DEPARTMENTS, DIALS, TOOL_OPTIONS, type AgentDraft } from '../../lib/builder';
import { suggestResponsibilities } from '../../lib/parseProfile';
import { buttonClass } from './buttonClass';
import { ListInput, RadioGroup, Select, Slider, TextInput } from './fields';

type Section<K extends keyof AgentDraft> = (patch: Partial<AgentDraft[K]>) => void;

function useSection<K extends keyof AgentDraft>(key: K): [AgentDraft[K], Section<K>] {
  const value = useBuilder((s) => s.draft[key]);
  const update = useBuilder((s) => s.update);
  return [value, (patch) => update((d) => ({ ...d, [key]: { ...d[key], ...patch } }))];
}

const OTHER = '__other__';

export function RoleStep() {
  const [role, set] = useSection('role');
  const known = DEPARTMENTS.includes(role.department);
  const [custom, setCustom] = useState(!known && role.department !== '');
  const [profile, setProfile] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="space-y-6">
      <Select
        label="Department *"
        value={custom ? OTHER : role.department}
        onChange={(v) => {
          if (v === OTHER) {
            setCustom(true);
            set({ department: '' });
          } else {
            setCustom(false);
            set({ department: v });
          }
        }}
        options={[
          { value: '', label: 'Choose a department…' },
          ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
          { value: OTHER, label: 'Other…' },
        ]}
      />
      {custom && (
        <TextInput
          label="Department name *"
          value={role.department}
          onChange={(v) => set({ department: v })}
        />
      )}
      <TextInput
        label="Role title"
        required
        value={role.title}
        onChange={(v) => set({ title: v })}
        placeholder="e.g. Invoice Reviewer"
      />

      <div className="space-y-2 rounded-xl border border-dashed border-border p-4">
        <TextAreaPlain
          label="Optional: paste a job description or resume-style profile"
          hint="We'll pull out likely responsibilities. This runs in your browser; nothing is sent anywhere."
          value={profile}
          onChange={setProfile}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={buttonClass.secondary}
            disabled={!profile.trim()}
            onClick={() => {
              const found = suggestResponsibilities(profile);
              const merged = [...role.responsibilities];
              for (const f of found)
                if (!merged.some((m) => m.toLowerCase() === f.toLowerCase())) merged.push(f);
              set({ responsibilities: merged });
              setNote(
                found.length
                  ? `Added ${merged.length - role.responsibilities.length} suggestion(s). Edit them below.`
                  : 'No clear responsibilities found. Try pasting bullet points.',
              );
            }}
          >
            Suggest responsibilities
          </button>
          <p role="status" className="text-sm text-muted">
            {note}
          </p>
        </div>
      </div>

      <ListInput
        label="Responsibilities"
        items={role.responsibilities}
        onChange={(items) => set({ responsibilities: items })}
        rows={6}
        placeholder={
          'Review incoming invoices against purchase orders\nFlag mismatches for the finance manager'
        }
      />
    </div>
  );
}

function TextAreaPlain(props: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block font-medium">{props.label}</span>
      <span className="block text-sm text-muted">{props.hint}</span>
      <textarea
        rows={5}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

export function PersonaStep() {
  const [dials, set] = useSection('dials');
  return (
    <div className="space-y-6">
      <p className="text-muted">
        Dials marked <Badge measured /> are measured in the Lab and drive the model recommendation.{' '}
        <Badge measured={false} /> dials only shape the system prompt.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {DIALS.map((d) => (
          <Slider
            key={d.key}
            label={d.label}
            low={d.low}
            high={d.high}
            value={dials[d.key]}
            onChange={(v) => set({ [d.key]: v })}
            badge={<Badge measured={d.measured} />}
          />
        ))}
      </div>
    </div>
  );
}

function Badge({ measured }: { measured: boolean }) {
  return (
    <span className="ml-1 rounded-full border border-border px-1.5 py-0.5 align-middle text-xs font-normal text-muted">
      {measured ? 'Measured' : 'Prompt only'}
    </span>
  );
}

export function NormsStep() {
  const [norms, set] = useSection('norms');
  return (
    <div className="space-y-6">
      <p className="text-muted">
        Describe the conventions of the people this agent communicates with, not a cultural identity
        for the agent. Concrete norms produce better behaviour and avoid stereotyping.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <TextInput
          label="Language"
          value={norms.language}
          onChange={(v) => set({ language: v })}
          placeholder="e.g. Korean"
        />
        <TextInput
          label="Locale"
          value={norms.locale}
          onChange={(v) => set({ locale: v })}
          hint="Dates, numbers, spelling. e.g. en-GB, ko-KR, de-DE"
        />
      </div>
      <RadioGroup
        legend="Expected register"
        value={norms.formality as 'casual' | 'neutral' | 'formal'}
        onChange={(v) => set({ formality: v })}
        options={[
          { value: 'casual', label: 'Casual', description: 'First names, relaxed tone' },
          { value: 'neutral', label: 'Neutral', description: 'Professional, approachable' },
          { value: 'formal', label: 'Formal', description: 'Titles, polished phrasing' },
        ]}
      />
      <RadioGroup
        legend="Feedback style the audience expects"
        value={norms.directness as 'indirect' | 'balanced' | 'direct'}
        onChange={(v) => set({ directness: v })}
        options={[
          {
            value: 'indirect',
            label: 'Indirect',
            description: 'Criticism is softened and implied',
          },
          { value: 'balanced', label: 'Balanced', description: 'Clear but tactful' },
          { value: 'direct', label: 'Direct', description: 'Problems stated plainly' },
        ]}
      />
    </div>
  );
}

export function CapabilitiesStep() {
  const [caps, set] = useSection('capabilities');
  const custom = caps.tools.filter((t) => !TOOL_OPTIONS.includes(t));
  const toggle = (tool: string) =>
    set({
      tools: caps.tools.includes(tool)
        ? caps.tools.filter((t) => t !== tool)
        : [...caps.tools, tool],
    });

  return (
    <div className="space-y-8">
      <RadioGroup
        legend="Memory"
        value={caps.memory}
        onChange={(v) => set({ memory: v })}
        options={[
          { value: 'none', label: 'None', description: 'Starts fresh every time' },
          { value: 'session', label: 'Session', description: 'Remembers within a conversation' },
          {
            value: 'long-term',
            label: 'Long-term',
            description: 'Keeps notes across conversations',
          },
        ]}
      />
      <fieldset className="space-y-2">
        <legend className="mb-1.5 font-medium">Tools and data access</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOOL_OPTIONS.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={caps.tools.includes(t)}
                onChange={() => toggle(t)}
                className="h-4 w-4 accent-accent"
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      <ListInput
        label="Other tools"
        items={custom}
        onChange={(items) =>
          set({ tools: [...caps.tools.filter((t) => TOOL_OPTIONS.includes(t)), ...items] })
        }
        rows={2}
        placeholder="e.g. Internal pricing API"
      />
      <Slider
        label="Priority"
        low="Speed"
        high="Depth"
        value={caps.priority}
        onChange={(v) => set({ priority: v })}
      />
      <RadioGroup
        legend="Budget sensitivity"
        value={caps.budget}
        onChange={(v) => set({ budget: v })}
        options={[
          { value: 'low', label: 'Low', description: 'Quality first; cost is secondary' },
          { value: 'medium', label: 'Medium', description: 'Weigh cost against quality' },
          { value: 'high', label: 'High', description: 'Keep running costs down' },
        ]}
      />
    </div>
  );
}

export function GovernanceStep() {
  const [gov, set] = useSection('governance');
  return (
    <div className="space-y-6">
      <TextInput
        label="Accountable human"
        required
        value={gov.accountableHuman}
        onChange={(v) => set({ accountableHuman: v })}
        hint="A role is fine, e.g. Head of Support."
      />
      <ListInput
        label="Decisions it can make alone"
        items={gov.autonomous}
        onChange={(items) => set({ autonomous: items })}
        placeholder="Reply to routine customer questions"
      />
      <ListInput
        label="Actions that need human sign-off"
        items={gov.needsSignOff}
        onChange={(items) => set({ needsSignOff: items })}
        placeholder="Issuing refunds over $100"
      />
      <ListInput
        label="Escalate immediately when"
        items={gov.escalation}
        onChange={(items) => set({ escalation: items })}
        placeholder="A customer mentions legal action"
      />
    </div>
  );
}
