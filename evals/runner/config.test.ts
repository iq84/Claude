// @vitest-environment node
import { TRAITS } from '../../src/lib/schema';
import { assertNoPlaceholders, loadConfig, validateConfig } from './config';

describe('eval config', () => {
  const cfg = loadConfig();

  it('loads the committed config with one suite and rubric per trait, ≥3 cases each', () => {
    expect(cfg.suites.map((s) => s.trait).sort()).toEqual([...TRAITS].sort());
    for (const s of cfg.suites) expect(s.cases.length).toBeGreaterThanOrEqual(3);
    for (const t of TRAITS) expect(cfg.rubrics[t]).toMatch(/\*\*5\*\*/);
  });

  it('rejects a model that lacks enough cross-family judges', () => {
    const bad = { ...cfg, judge: { ...cfg.judge, perResponse: 3 } };
    expect(() => validateConfig(bad)).toThrow(/judges from other families/);
  });

  it('refuses to run with placeholder model IDs', () => {
    expect(() => assertNoPlaceholders([{ id: 'x', apiModel: 'REPLACE_ME' }])).toThrow(
      /Fill in apiModel/,
    );
    expect(() => assertNoPlaceholders([{ id: 'x', apiModel: 'real-id' }])).not.toThrow();
  });
});
