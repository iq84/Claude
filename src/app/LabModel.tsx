import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SampleBanner from '../components/SampleBanner';
import SteerRanges from '../components/SteerRanges';
import Tabs from '../components/Tabs';
import TraitRadar from '../components/TraitRadar';
import { useQueryEnum } from '../components/useQueryState';
import { findModel, personalityIndex as index } from '../lib/data';
import { formatLatency, formatUsd, TRAIT_SHORT } from '../lib/lab';
import { TRAITS, TRAIT_LABELS } from '../lib/schema';

const TABS = ['overview', 'samples'] as const;

export default function LabModel() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const model = findModel(modelId);
  const [tab, setTab] = useQueryEnum('tab', TABS, 'overview');
  const [trait, setTrait] = useQueryEnum('trait', TRAITS, 'pushback');

  if (!model) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Model not found</h1>
        <Link to="/lab" className="text-accent underline">
          Back to the Personality Index
        </Link>
      </div>
    );
  }

  const stats = [
    { label: 'Avg latency', value: formatLatency(model.avgLatencyMs) },
    { label: 'Avg output tokens', value: model.avgOutputTokens.toLocaleString('en-US') },
    { label: 'Price / 1K output tokens', value: formatUsd(model.costPer1kOutputTokens) },
    { label: 'Cost of this test run', value: formatUsd(model.estimatedRunCostUsd) },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/lab" className="text-sm text-accent hover:underline">
            ← Personality Index
          </Link>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Switch model</span>
            <select
              value={model.id}
              onChange={(e) => navigate(`/lab/${e.target.value}?${params.toString()}`)}
              className="rounded-md border border-border bg-bg px-2 py-1 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {index.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{model.displayName}</h1>
          <p className="text-sm text-muted">
            {model.provider} · tested <time dateTime={model.testedAt}>{model.testedAt}</time>
          </p>
        </div>
        {index.sample && <SampleBanner compact />}
        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border px-3 py-2">
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <Tabs
        label="Model details"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'samples', label: 'Sample responses' },
        ]}
      >
        {tab === 'overview' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="profile-heading" className="space-y-1">
              <h2 id="profile-heading" className="text-lg font-semibold">
                Baseline profile
              </h2>
              <p className="text-sm text-muted">Behaviour with a neutral system prompt, 0–100.</p>
              <TraitRadar model={model} view="baseline" />
            </section>
            <section aria-labelledby="range-heading" className="space-y-1">
              <h2 id="range-heading" className="text-lg font-semibold">
                Achievable range
              </h2>
              <p className="text-sm text-muted">
                The bar spans what prompting reached on each trait; the dot marks the baseline.
              </p>
              <div className="pt-2">
                <SteerRanges model={model} />
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs
              label="Trait"
              size="sm"
              active={trait}
              onChange={setTrait}
              tabs={TRAITS.map((t) => ({ id: t, label: TRAIT_SHORT[t] }))}
            >
              <h2 className="sr-only">{TRAIT_LABELS[trait]} samples</h2>
              <p className="mb-3 text-sm text-muted">
                {TRAIT_LABELS[trait]}: baseline responses with their judged score (0–100).
              </p>
              {model.samples[trait].length === 0 ? (
                <p className="text-sm text-muted">No samples recorded.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {model.samples[trait].map((s, i) => (
                    <article
                      key={i}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3"
                    >
                      <div>
                        <p className="text-xs font-medium text-muted uppercase">Prompt</p>
                        <p className="mt-1 text-sm whitespace-pre-wrap">{s.prompt}</p>
                      </div>
                      <div className="max-h-72 flex-1 overflow-auto rounded-lg bg-surface p-3">
                        <p className="text-xs font-medium text-muted uppercase">Response</p>
                        <p className="mt-1 text-sm break-words whitespace-pre-wrap">{s.response}</p>
                      </div>
                      <p className="text-sm text-muted">
                        Score <span className="font-semibold text-fg tabular-nums">{s.score}</span>
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </Tabs>
          </div>
        )}
      </Tabs>
    </div>
  );
}
