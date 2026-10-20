import { useEffect, useRef, useState } from 'react';
import {
  CapabilitiesStep,
  GovernanceStep,
  NormsStep,
  PersonaStep,
  RoleStep,
} from '../components/builder/steps';
import ReviewStep from '../components/builder/ReviewStep';
import { buttonClass } from '../components/builder/buttonClass';
import { STEPS, useBuilder, validateStep } from './builderStore';

const STEP_INTRO = [
  'What job is this agent hired to do?',
  'Set the personality. Measured dials steer the model recommendation.',
  'How the people this agent works with expect to be addressed.',
  'What the agent can remember, use and spend.',
  'What it may decide alone, what needs a human, and who is accountable.',
  'Pick a base model and export the hiring packet.',
];

const STEP_COMPONENTS = [
  RoleStep,
  PersonaStep,
  NormsStep,
  CapabilitiesStep,
  GovernanceStep,
  ReviewStep,
];

export default function Builder() {
  const step = useBuilder((s) => s.step);
  const draft = useBuilder((s) => s.draft);
  const setStep = useBuilder((s) => s.setStep);
  const reset = useBuilder((s) => s.reset);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new step's heading so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  /** Steps before `target` must be valid to go there. */
  const go = (target: number) => {
    for (let s = 0; s < target; s++) {
      const msg = validateStep(s, draft);
      if (msg) {
        setError(msg);
        setStep(s);
        return;
      }
    }
    setError(null);
    setStep(target);
  };

  const Current = STEP_COMPONENTS[step]!;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Agent Builder</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Design an agent</h1>
        <p className="max-w-2xl text-muted">
          Turn a role into a hiring packet: a persona card, a calibrated system prompt and a full
          agent spec, with a base model chosen from measured data. Your answers are saved in this
          browser.
        </p>
      </header>

      <nav aria-label="Builder steps">
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === step ? 'step' : undefined}
                className={`w-full rounded-md border px-2 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-accent sm:text-sm ${
                  i === step
                    ? 'border-accent bg-accent font-medium text-accent-fg'
                    : i < step
                      ? 'border-border bg-surface text-fg'
                      : 'border-border text-muted hover:text-fg'
                }`}
              >
                <span className="block text-[0.7rem] opacity-80">Step {i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section
        aria-labelledby="step-heading"
        className="space-y-6 rounded-xl border border-border p-4 sm:p-6"
      >
        <div className="space-y-1">
          <h2
            id="step-heading"
            ref={heading}
            tabIndex={-1}
            className="text-2xl font-semibold focus:outline-none"
          >
            {STEPS[step]}
          </h2>
          <p className="text-muted">{STEP_INTRO[step]}</p>
        </div>
        <Current />
        {error && (
          <p role="alert" className="rounded-md border border-accent bg-surface px-3 py-2 text-sm">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            className={buttonClass.secondary}
            disabled={step === 0}
            onClick={() => go(step - 1)}
          >
            Back
          </button>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClass.secondary}
              onClick={() => {
                if (window.confirm('Clear this agent and start over?')) {
                  reset();
                  setError(null);
                }
              }}
            >
              Start over
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                className={buttonClass.primary}
                onClick={() => {
                  const msg = validateStep(step, draft);
                  if (msg) setError(msg);
                  else go(step + 1);
                }}
              >
                Next: {STEPS[step + 1]}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
