import { describe, expect, it } from 'vitest';
import { DISTRICTS, scoreDistricts } from './benchmark/districts';

/**
 * Regression guard for the held-out benchmark (official RTGS district names).
 * The floors are the accuracy reached so far; raise them when the rules improve, never lower them.
 * Test-split misses are deliberately not shown, so the test split stays unseen.
 */
const FLOOR = { dev: 0.95, test: 0.92 };

describe('district benchmark', () => {
  it('has every district once, split into dev and test', () => {
    expect(DISTRICTS.length).toBe(878);
    expect(new Set(DISTRICTS.map((d) => `${d.thai}|${d.province}`)).size).toBe(878);
  });

  it.each(['dev', 'test'] as const)('%s accuracy does not regress', (split) => {
    const { correct, total } = scoreDistricts(split);
    expect(correct / total).toBeGreaterThanOrEqual(FLOOR[split]);
  });
});
