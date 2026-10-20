import { TRAITS, TRAIT_LABELS, type ModelResult } from '../lib/schema';
import { steerability, steerRange } from '../lib/lab';

/**
 * Per trait: the range prompting can reach (steer-low → steer-high) with the baseline marked.
 * This is the "achievable range" the Agent Builder recommends from.
 */
export default function SteerRanges({ model }: { model: ModelResult }) {
  return (
    <ul className="space-y-4">
      {TRAITS.map((t) => {
        const { low, high, baseline } = steerRange(model, t);
        return (
          <li key={t}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium">{TRAIT_LABELS[t]}</span>
              <span className="text-muted">
                Baseline <span className="text-fg">{baseline}</span> · range{' '}
                <span className="text-fg">
                  {low}–{high}
                </span>{' '}
                · steerability <span className="text-fg">{steerability(model, t)}</span>
              </span>
            </div>
            <div
              className="relative mt-2 h-3 rounded-full bg-surface ring-1 ring-border"
              aria-hidden="true"
            >
              <div
                className="absolute inset-y-0 rounded-full bg-series-1/50"
                style={{ left: `${low}%`, width: `${Math.max(high - low, 0.5)}%` }}
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-series-1"
                style={{ left: `${baseline}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
