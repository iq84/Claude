import { useState } from 'react';
import { Link } from 'react-router-dom';
import SampleBanner from '../components/SampleBanner';
import Tabs from '../components/Tabs';
import TraitRadar from '../components/TraitRadar';
import { useQueryEnum, useQuerySet } from '../components/useQueryState';
import { lastTested, personalityIndex as index } from '../lib/data';
import { formatLatency, formatUsd, TRAIT_DESCRIPTIONS, viewValue, type LabView } from '../lib/lab';
import { TRAITS, TRAIT_LABELS, type ModelResult, type Trait } from '../lib/schema';

const TABS = ['profiles', 'compare', 'methodology'] as const;
const VIEWS = ['baseline', 'steerability'] as const;

const VIEW_HELP: Record<LabView, string> = {
  baseline: 'Behaviour with a neutral system prompt. 0–100, higher means more of the trait.',
  steerability:
    'How far prompting moves each trait (steer-high minus steer-low). Higher means a written persona is more likely to stick.',
};

type SortKey = Trait | 'name' | 'latency' | 'cost';

const ALL_IDS = index.models.map((m) => m.id);

export default function Lab() {
  const [tab, setTab] = useQueryEnum('tab', TABS, 'profiles');
  const [view, setView] = useQueryEnum('view', VIEWS, 'baseline');
  const [selected, setSelected] = useQuerySet('models', ALL_IDS);
  const models = index.models.filter((m) => selected.includes(m.id));

  const toggleModel = (id: string) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : ALL_IDS.filter((x) => x === id || selected.includes(x)),
    );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          Model Personality Lab
        </p>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Personality Index</h1>
          <p className="text-sm text-muted">
            Last tested <time dateTime={lastTested()}>{lastTested()}</time> · {index.models.length}{' '}
            models · {index.reps} reps per case
          </p>
        </div>
        <p className="max-w-3xl text-muted">
          How base LLMs behave on six workplace traits, and how far a system prompt can steer them.
        </p>
        {index.sample && <SampleBanner compact />}
      </header>

      <div
        role="group"
        aria-label="Filters"
        className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-surface p-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Models</span>
          {index.models.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={selected.includes(m.id)}
              onClick={() => toggleModel(m.id)}
              className={`rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                selected.includes(m.id)
                  ? 'border-accent bg-bg text-fg'
                  : 'border-border text-muted line-through'
              }`}
            >
              {m.displayName}
            </button>
          ))}
          {selected.length < ALL_IDS.length && (
            <button
              type="button"
              onClick={() => setSelected(ALL_IDS)}
              className="text-sm text-accent underline"
            >
              Show all
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" id="view-label">
            View
          </span>
          <div
            role="group"
            aria-labelledby="view-label"
            className="inline-flex rounded-lg border border-border bg-bg p-0.5"
          >
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-sm capitalize focus-visible:outline-2 focus-visible:outline-accent ${
                  view === v ? 'bg-accent font-medium text-accent-fg' : 'text-muted hover:text-fg'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Tabs
        label="Personality Index sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'profiles', label: 'Profiles' },
          { id: 'compare', label: 'Compare' },
          { id: 'methodology', label: 'Methodology' },
        ]}
      >
        {models.length === 0 && tab !== 'methodology' ? (
          <p className="text-muted">No models selected. Pick at least one above.</p>
        ) : tab === 'profiles' ? (
          <Profiles models={models} view={view} />
        ) : tab === 'compare' ? (
          <Compare models={models} view={view} />
        ) : (
          <Methodology />
        )}
      </Tabs>
    </div>
  );
}

function Profiles({ models, view }: { models: ModelResult[]; view: LabView }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{VIEW_HELP[view]}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {models.map((m) => (
          <article key={m.id} className="rounded-xl border border-border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                <Link
                  to={`/lab/${m.id}`}
                  className="hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {m.displayName} →
                </Link>
              </h2>
              <span className="text-xs text-muted">{m.provider}</span>
            </div>
            <TraitRadar model={m} view={view} height={220} />
          </article>
        ))}
      </div>
    </div>
  );
}

function Compare({ models, view }: { models: ModelResult[]; view: LabView }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'name', desc: false });
  const value = (m: ModelResult, k: SortKey): number | string =>
    k === 'name'
      ? m.displayName
      : k === 'latency'
        ? m.avgLatencyMs
        : k === 'cost'
          ? m.costPer1kOutputTokens
          : viewValue(m, k, view);
  const rows = [...models].sort((a, b) => {
    const x = value(a, sort.key);
    const y = value(b, sort.key);
    const c = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
    return sort.desc ? -c : c;
  });
  // Traits sort high→low first; latency and cost low→high first.
  const clickSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, desc: !s.desc } : { key, desc: TRAITS.includes(key as Trait) },
    );
  const best = (t: Trait) => Math.max(...models.map((m) => viewValue(m, t, view)));

  const header = (key: SortKey, label: string, align = 'text-right') => (
    <th
      scope="col"
      aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}
      className={`px-3 py-2 font-medium ${align}`}
    >
      <button
        type="button"
        onClick={() => clickSort(key)}
        className="inline-flex items-center gap-1 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        {label}
        <span aria-hidden="true" className="text-xs">
          {sort.key === key ? (sort.desc ? '▼' : '▲') : '↕'}
        </span>
      </button>
    </th>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        {VIEW_HELP[view]} Click a column to sort; the top score in each trait is bold.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">{view} trait scores, latency and cost per model</caption>
          <thead className="bg-surface text-muted">
            <tr>
              {header('name', 'Model', 'text-left')}
              {TRAITS.map((t) => header(t, TRAIT_LABELS[t]))}
              {header('latency', 'Avg latency')}
              {header('cost', '$ / 1K out')}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <th scope="row" className="px-3 py-2 font-medium whitespace-nowrap">
                  <Link to={`/lab/${m.id}`} className="hover:underline">
                    {m.displayName}
                  </Link>
                </th>
                {TRAITS.map((t) => {
                  const v = viewValue(m, t, view);
                  return (
                    <td
                      key={t}
                      className={`px-3 py-2 text-right tabular-nums ${v === best(t) ? 'font-bold' : ''}`}
                    >
                      {v}
                    </td>
                  );
                })}
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
    </div>
  );
}

function Methodology() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <dl className="grid content-start gap-2 sm:grid-cols-2">
        {TRAITS.map((t) => (
          <div key={t} className="rounded-lg bg-surface p-3">
            <dt className="font-medium">{TRAIT_LABELS[t]}</dt>
            <dd className="text-sm text-muted">{TRAIT_DESCRIPTIONS[t]}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-3 text-sm text-muted">
        <p>
          <strong className="text-fg">Test design.</strong> Each trait has its own test cases. Every
          case runs under three system prompts: a neutral baseline, one instructing the trait to be
          strong (steer high) and one instructing it to be weak (steer low). Each combination
          repeats {index.reps} times.
        </p>
        <p>
          <strong className="text-fg">Scoring.</strong> {index.judge} An LLM judge scores each
          response 1–5 against a written rubric without seeing which system prompt was used. Scores
          are averaged across cases and repeats and mapped to 0–100.
        </p>
        <p>
          <strong className="text-fg">Settings.</strong> Models run at temperature 0.7 where the
          provider allows it; models that don't accept a custom temperature run at their default.
          Reasoning effort is held fixed where a model exposes it.
        </p>
        <p>
          <strong className="text-fg">Limitations.</strong> Small test sets, LLM judges and a single
          point in time. Model versions change, so results are dated. Treat differences of a few
          points as noise, and test with your own prompts (try the{' '}
          <Link to="/playground" className="text-accent underline">
            Playground
          </Link>
          ) before committing to a model.
        </p>
      </div>
    </div>
  );
}
