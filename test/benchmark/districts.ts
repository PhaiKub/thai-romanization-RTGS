import { readFileSync } from 'node:fs';
import { romanize } from '../../src/index';

export interface District {
  thai: string;
  rtgs: string;
  province: string;
  split: 'dev' | 'test';
  exclude?: string;
}

export const DISTRICTS: readonly District[] = (
  JSON.parse(readFileSync(new URL('./districts.json', import.meta.url), 'utf8')) as { districts: District[] }
).districts;

/** RTGS spacing and hyphens vary between sources, so only the letters are compared. */
const letters = (s: string) => s.toLowerCase().replace(/[\s\-'’]/g, '');

export interface Score {
  correct: number;
  total: number;
  misses: { thai: string; expected: string; got: string }[];
}

/** Accuracy of `romanize()` (default options) on one split, excluded names left out. */
export function scoreDistricts(split: 'dev' | 'test'): Score {
  const rows = DISTRICTS.filter((d) => d.split === split && !d.exclude);
  const misses = rows
    .map((d) => ({ thai: d.thai, expected: d.rtgs, got: romanize(d.thai) }))
    .filter((m) => letters(m.got) !== letters(m.expected));
  return { correct: rows.length - misses.length, total: rows.length, misses };
}
