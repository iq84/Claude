import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { TRAIT_LABELS, type ModelResult } from '../lib/schema';
import { radarRows, type LabView } from '../lib/lab';

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { trait: keyof typeof TRAIT_LABELS; value: number } }[];
  view: LabView;
}

function RadarTooltip({ active, payload, view }: TooltipProps) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return (
    <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{TRAIT_LABELS[row.trait]}</p>
      <p className="text-muted">
        {view === 'baseline' ? 'Baseline' : 'Steerability'}:{' '}
        <span className="text-fg">{row.value}</span>
      </p>
    </div>
  );
}

/** One model's six traits on a 0–100 radar. Single series, so no legend: the card title names it. */
export default function TraitRadar({ model, view }: { model: ModelResult; view: LabView }) {
  const rows = radarRows(model, view);
  const summary = rows.map((r) => `${TRAIT_LABELS[r.trait]} ${r.value}`).join(', ');
  return (
    <figure className="chart text-series-1" aria-label={`${model.displayName} ${view}: ${summary}`}>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart
          data={rows}
          outerRadius="70%"
          margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
        >
          <PolarGrid />
          <PolarAngleAxis dataKey="label" />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
          <Radar
            dataKey="value"
            stroke="currentColor"
            strokeWidth={2}
            fill="currentColor"
            fillOpacity={0.18}
            dot={{ r: 4, fill: 'currentColor', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
          <Tooltip content={<RadarTooltip view={view} />} cursor={false} />
        </RadarChart>
      </ResponsiveContainer>
    </figure>
  );
}
