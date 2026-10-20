import { useState } from 'react';
import { Link } from 'react-router-dom';
import SampleBanner from '../components/SampleBanner';
import TraitRadar from '../components/TraitRadar';
import { lastTested, personalityIndex as index } from '../lib/data';
import { formatLatency, formatUsd, TRAIT_DESCRIPTIONS, viewValue, type LabView } from '../lib/lab';
import { TRAITS, TRAIT_LABELS } from '../lib/schema';

const VIEWS: { id: LabView; label: string; help: string }[] = [
  {
    id: 'baseline',
    label: 'Baseline',
    help: 'How each model behaves with a neutral system prompt. 0–100, higher means more of the trait.',
  },
  {
    id: 'steerability',
    label: 'Steerability',
    help: 'How far prompting moves each trait: the steer-high score minus the steer-low score. Higher means the persona you write is more likely to stick.',
  },
];

export default function Lab() {
  const [view, setView] = useState<LabView>('baseline');
  const current = VIEWS.find((v) => v.id === view)!;

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          Model Personality Lab
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Personality Index</h1>
        <p className="max-w-2xl text-muted">
          How base LLMs behave on six workplace traits, and how far a system prompt can steer them.
          Use it to pick the right base model for each agent's persona.
        </p>
        <p className="text-sm text-muted">
          Last tested <time dateTime={lastTested()}>{lastTested()}</time> · {index.models.length}{' '}
          models · {index.reps} reps per case
        </p>
        {index.sample && <SampleBanner />}
      </header>

      <section aria-labelledby="charts-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="charts-heading" className="text-2xl font-semibold">
            Trait profiles
          </h2>
          <div
            role="group"
            aria-label="Chart view"
            className="inline-flex rounded-lg border border-border p-1"
          >
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={`rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                  view === v.id
                    ? 'bg-accent font-medium text-accent-fg'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted">{current.help}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {index.models.map((m) => (
            <article key={m.id} className="rounded-xl border border-border p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  <Link
                    to={`/lab/${m.id}`}
                    className="hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {m.displayName}
                  </Link>
                </h3>
                <span className="text-xs text-muted">{m.provider}</span>
              </div>
              <TraitRadar model={m} view={view} />
              <Link
                to={`/lab/${m.id}`}
                className="text-sm text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Ranges and sample responses →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="table-heading" className="space-y-4">
        <h2 id="table-heading" className="text-2xl font-semibold">
          Comparison
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">
              {current.label} trait scores, latency and cost per model
            </caption>
            <thead className="bg-surface text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Model
                </th>
                {TRAITS.map((t) => (
                  <th key={t} scope="col" className="px-3 py-2 text-right font-medium">
                    {TRAIT_LABELS[t]}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Avg latency
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  $ / 1K output tokens
                </th>
              </tr>
            </thead>
            <tbody>
              {index.models.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <th scope="row" className="px-3 py-2 font-medium whitespace-nowrap">
                    <Link to={`/lab/${m.id}`} className="hover:underline">
                      {m.displayName}
                    </Link>
                  </th>
                  {TRAITS.map((t) => (
                    <td key={t} className="px-3 py-2 text-right tabular-nums">
                      {viewValue(m, t, view)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatLatency(m.avgLatencyMs)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatUsd(m.costPer1kOutputTokens)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Showing {current.label.toLowerCase()} scores.</p>
      </section>

      <section aria-labelledby="method-heading" className="max-w-3xl space-y-4">
        <h2 id="method-heading" className="text-2xl font-semibold">
          Methodology
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {TRAITS.map((t) => (
            <div key={t} className="rounded-lg bg-surface p-3">
              <dt className="font-medium">{TRAIT_LABELS[t]}</dt>
              <dd className="text-sm text-muted">{TRAIT_DESCRIPTIONS[t]}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-3 text-muted">
          <p>
            <strong className="text-fg">Test design.</strong> Each trait has its own set of test
            cases. Every case runs under three system prompts: a neutral baseline, one instructing
            the trait to be strong (steer high) and one instructing it to be weak (steer low). Each
            combination repeats {index.reps} times.
          </p>
          <p>
            <strong className="text-fg">Scoring.</strong> {index.judge} An LLM judge scores each
            response 1–5 against a written rubric without seeing which system prompt was used.
            Scores are averaged across cases and repeats and mapped to 0–100.
          </p>
          <p>
            <strong className="text-fg">Settings.</strong> Models run at temperature 0.7 where the
            provider allows it; models that don't accept a custom temperature run at their default.
            Reasoning effort is held fixed where a model exposes it.
          </p>
          <p>
            <strong className="text-fg">Limitations.</strong> Small test sets, LLM judges and a
            single point in time. Model versions change, so results are dated. Treat differences of
            a few points as noise, and test with your own prompts before committing to a model.
          </p>
        </div>
      </section>
    </div>
  );
}
