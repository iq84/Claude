import { personalityIndex, lastTested } from './data';
import { formatLatency, formatUsd, radarRows, steerability, steerRange } from './lab';
import type { ModelResult } from './schema';

const m = personalityIndex.models[0] as ModelResult;

describe('lab helpers', () => {
  it('computes steerability as steer-high minus steer-low', () => {
    expect(steerability(m, 'pushback')).toBeCloseTo(m.steerHigh.pushback - m.steerLow.pushback, 1);
  });

  it('orders the range low→high even if steering backfires', () => {
    const backwards = {
      ...m,
      steerHigh: { ...m.steerHigh, creativity: 20 },
      steerLow: { ...m.steerLow, creativity: 60 },
    };
    expect(steerRange(backwards, 'creativity')).toMatchObject({ low: 20, high: 60 });
    expect(steerability(backwards, 'creativity')).toBe(-40);
  });

  it('builds one radar row per trait for each view', () => {
    expect(radarRows(m, 'baseline').map((r) => r.value)).toEqual(Object.values(m.baseline));
    expect(radarRows(m, 'steerability')).toHaveLength(6);
  });

  it('formats latency and money', () => {
    expect(formatLatency(850)).toBe('850 ms');
    expect(formatLatency(2400)).toBe('2.4 s');
    expect(formatUsd(0.0005)).toBe('$0.0005');
    expect(formatUsd(4.1)).toBe('$4.10');
  });
});

describe('committed index', () => {
  it('validates and has a last-tested date', () => {
    expect(personalityIndex.models.length).toBeGreaterThan(0);
    expect(lastTested()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
