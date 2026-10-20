import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuilder } from '../../app/builderStore';
import { personalityIndex } from '../../lib/data';
import { buildSpec, fileSlug, personaCard, specJson } from '../../lib/export';
import { recommend, type TraitStatus } from '../../lib/recommend';
import { TRAIT_LABELS } from '../../lib/schema';
import SampleBanner from '../SampleBanner';
import Tabs from '../Tabs';
import { buttonClass } from './buttonClass';
import { downloadText } from './download';

const STATUS: Record<TraitStatus, string> = {
  natural: 'Natural fit',
  steerable: 'Steerable',
  'out-of-reach': 'Out of reach',
};

export default function ReviewStep() {
  const draft = useBuilder((s) => s.draft);
  const selectedId = useBuilder((s) => s.selectedModelId);
  const selectModel = useBuilder((s) => s.selectModel);
  const [copied, setCopied] = useState('');
  const [tab, setTab] = useState<'match' | 'prompt' | 'export'>('match');

  const recs = useMemo(() => recommend(draft, personalityIndex.models), [draft]);
  const chosen = recs.find((r) => r.modelId === selectedId) ?? recs[0];
  const spec = useMemo(() => buildSpec(draft, chosen), [draft, chosen]);
  const slug = fileSlug(spec);

  return (
    <Tabs
      label="Review"
      active={tab}
      onChange={setTab}
      tabs={[
        { id: 'match', label: 'Model match' },
        { id: 'prompt', label: 'System prompt' },
        { id: 'export', label: 'Export' },
      ]}
    >
      {tab === 'match' && (
        <section aria-labelledby="match-heading" className="space-y-4">
          <h3 id="match-heading" className="text-xl font-semibold">
            Recommended base models
          </h3>
          {personalityIndex.sample && <SampleBanner />}
          <p className="text-sm text-muted">
            Ranked by how well each model's measured range covers your Pushback, Scrutiny,
            Clarification and Creativity targets, plus speed and cost.{' '}
            <Link to="/lab" className="text-accent underline">
              See the Lab data
            </Link>
            .
          </p>
          <fieldset>
            <legend className="sr-only">Choose a base model</legend>
            <div className="grid gap-3 lg:grid-cols-3">
              {recs.map((r, i) => (
                <label
                  key={r.modelId}
                  className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border p-4 has-[:checked]:border-2 has-[:checked]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="model"
                        checked={chosen?.modelId === r.modelId}
                        onChange={() => selectModel(r.modelId)}
                        className="accent-accent"
                      />
                      <span className="font-semibold">
                        {i + 1}. {r.displayName}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-2xl font-semibold tabular-nums">
                        {r.fitScore}
                      </span>
                      <span className="block text-xs text-muted">fit / 100</span>
                    </span>
                  </span>
                  <span className="text-sm text-muted">{r.rationale}</span>
                  <span className="mt-auto space-y-1 text-xs">
                    {r.traits.map((t) => (
                      <span key={t.trait} className="flex flex-wrap justify-between gap-x-2">
                        <span className="font-medium">{TRAIT_LABELS[t.trait]}</span>
                        <span className="text-muted">
                          {STATUS[t.status]} · target {t.target}, range {t.low}–{t.high}
                        </span>
                      </span>
                    ))}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {tab === 'prompt' && (
        <section aria-labelledby="prompt-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="prompt-heading" className="text-xl font-semibold">
              System prompt
            </h3>
            <div className="flex items-center gap-3">
              <span role="status" className="text-sm text-muted">
                {copied}
              </span>
              <button
                type="button"
                className={buttonClass.secondary}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(spec.systemPrompt);
                    setCopied('Copied.');
                  } catch {
                    setCopied('Copy failed. Select the text and copy it manually.');
                  }
                }}
              >
                Copy
              </button>
            </div>
          </div>
          <pre className="max-h-[28rem] overflow-auto rounded-xl border border-border bg-surface p-4 text-sm break-words whitespace-pre-wrap">
            {spec.systemPrompt}
          </pre>
        </section>
      )}

      {tab === 'export' && (
        <section aria-labelledby="export-heading" className="space-y-3">
          <h3 id="export-heading" className="text-xl font-semibold">
            Download the hiring packet
          </h3>
          <p className="text-sm text-muted">
            The persona card is a readable summary for people. The agent spec is the full
            configuration as JSON (schema version {spec.schemaVersion}).
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClass.primary}
              onClick={() =>
                downloadText(`${slug}.md`, personaCard(spec, chosen?.displayName), 'text/markdown')
              }
            >
              Persona card (.md)
            </button>
            <button
              type="button"
              className={buttonClass.primary}
              onClick={() => downloadText(`${slug}.json`, specJson(spec), 'application/json')}
            >
              Agent spec (.json)
            </button>
          </div>
          <p className="text-sm text-muted">
            Want to see how it behaves first?{' '}
            <Link to="/playground?from=builder" className="text-accent underline">
              Try this agent in the Playground
            </Link>
            .
          </p>
        </section>
      )}
    </Tabs>
  );
}
