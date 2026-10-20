import { Link, useParams } from 'react-router-dom';
import SampleBanner from '../components/SampleBanner';
import SteerRanges from '../components/SteerRanges';
import TraitRadar from '../components/TraitRadar';
import { findModel, personalityIndex as index } from '../lib/data';
import { formatLatency, formatUsd } from '../lib/lab';
import { TRAITS, TRAIT_LABELS } from '../lib/schema';

export default function LabModel() {
  const { modelId } = useParams();
  const model = findModel(modelId);

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
    <div className="space-y-12">
      <header className="space-y-4">
        <Link to="/lab" className="text-sm text-accent hover:underline">
          ← Personality Index
        </Link>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{model.displayName}</h1>
        <p className="text-sm text-muted">
          {model.provider} · tested <time dateTime={model.testedAt}>{model.testedAt}</time>
        </p>
        {index.sample && <SampleBanner />}
      </header>

      <section aria-label="Run statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="profile-heading" className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 id="profile-heading" className="text-2xl font-semibold">
            Baseline profile
          </h2>
          <p className="text-sm text-muted">Behaviour with a neutral system prompt, 0–100.</p>
          <TraitRadar model={model} view="baseline" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Achievable range</h2>
          <p className="text-sm text-muted">
            The bar spans the steer-low to steer-high scores: how far a system prompt moved each
            trait. The dot marks the baseline.
          </p>
          <div className="pt-2">
            <SteerRanges model={model} />
          </div>
        </div>
      </section>

      <section aria-labelledby="samples-heading" className="space-y-8">
        <div className="space-y-2">
          <h2 id="samples-heading" className="text-2xl font-semibold">
            Sample responses
          </h2>
          <p className="text-sm text-muted">Baseline responses with their judged score (0–100).</p>
        </div>
        {TRAITS.map((t) => (
          <div key={t} className="space-y-3">
            <h3 className="text-lg font-semibold">{TRAIT_LABELS[t]}</h3>
            {model.samples[t].length === 0 ? (
              <p className="text-sm text-muted">No samples recorded.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {model.samples[t].map((s, i) => (
                  <article
                    key={i}
                    className="flex flex-col gap-3 rounded-xl border border-border p-4"
                  >
                    <div>
                      <p className="text-xs font-medium text-muted uppercase">Prompt</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{s.prompt}</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-surface p-3">
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
          </div>
        ))}
      </section>
    </div>
  );
}
