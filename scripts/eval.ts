/**
 * Accuracy report over the golden fixtures: `npm run eval`.
 * Rule words are checked with the built-in dictionary switched off, so they measure the rules alone.
 */
import { romanize } from '../src/index';
import type { RomanizeOptions } from '../src/types';
import { DICTIONARY_WORDS, EVERYDAY_WORDS, GIVEN_NAME_WORDS, PROVINCE_TITLES, RULE_WORDS, SENTENCES } from '../test/fixtures/golden';

const strip = (s: string) => s.replace(/\s+/g, '');
const same = (s: string) => s;

const suites: [string, Readonly<Record<string, string>>, RomanizeOptions, (s: string) => string][] = [
  ['Rule words (no dictionary)', RULE_WORDS, { useBuiltinDictionary: false, segmenter: 'none' }, strip],
  ['Everyday words', EVERYDAY_WORDS, { segmenter: 'none' }, strip],
  ['Given names', GIVEN_NAME_WORDS, { segmenter: 'none' }, strip],
  ['Dictionary words', DICTIONARY_WORDS, { segmenter: 'none' }, strip],
  ['Provinces (title case)', PROVINCE_TITLES, { case: 'title' }, same],
  ['Sentences', SENTENCES, {}, same],
];

let failed = 0;
for (const [name, cases, options, norm] of suites) {
  const misses: string[] = [];
  for (const [thai, expected] of Object.entries(cases)) {
    const got = norm(romanize(thai, options));
    if (got !== norm(expected)) misses.push(`  ${thai.padEnd(16)} expected ${expected.padEnd(24)} got ${got}`);
  }
  const total = Object.keys(cases).length;
  const pct = ((100 * (total - misses.length)) / total).toFixed(1);
  console.log(`${name}: ${total - misses.length}/${total} (${pct}%)`);
  if (misses.length) {
    failed += misses.length;
    console.log(misses.join('\n'));
  }
}
process.exitCode = failed ? 1 : 0;
