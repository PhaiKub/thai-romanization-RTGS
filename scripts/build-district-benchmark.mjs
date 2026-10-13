/**
 * Builds test/benchmark/districts.json from English Wikipedia's "List of districts of Thailand",
 * whose district names follow the official RTGS romanization.
 *
 *   node scripts/build-district-benchmark.mjs
 *
 * Each district is assigned once and for all to `dev` (may be inspected while improving the rules)
 * or `test` (never inspected; only its accuracy is reported) by a hash of its Thai name.
 * Names whose official spelling is not RTGS (royal names such as Sirindhorn) are kept but marked `exclude`.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const PAGE = 'List_of_districts_of_Thailand';
const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${PAGE}&prop=wikitext|revid&format=json&formatversion=2`;
const res = await fetch(url, { headers: { 'user-agent': 'thai-rtgs benchmark builder (https://github.com/PhaiKub/thai-romanization-RTGS)' } });
const { parse } = await res.json();

/** Spellings RTGS never produces (v, j, dh, bh, a g outside ng, a c outside ch, l or r closing a syllable). */
const NOT_RTGS = /[vjzqx]|dh|bh|(?<!n)g|c(?!h)|[lr](?![aeiouw])/i;

const rows = [];
for (const line of parse.wikitext.split('\n')) {
  if (!line.startsWith('|[[')) continue;
  const cells = line.slice(1).split('||').map((c) => c.trim());
  const link = cells[0].match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  const thai = cells[1]?.replace(/\s+/g, '');
  if (!link || !thai || !/[฀-๿]/.test(thai)) continue;
  // "Mae Tha, Lampang" / "Bang Sai 1404" → the name itself
  const rtgs = (link[2] ?? link[1]).replace(/ district.*$/i, '').replace(/,.*$/, '').replace(/\s+\d+$/, '').trim();
  const province = cells[3]?.replace(/\s+/g, '') ?? '';
  const hash = createHash('sha256').update(thai).digest()[0];
  const row = { thai, rtgs, province, split: hash % 2 === 0 ? 'dev' : 'test' };
  if (NOT_RTGS.test(rtgs)) row.exclude = 'official spelling is not RTGS';
  rows.push(row);
}

const out = {
  source: `https://en.wikipedia.org/wiki/${PAGE}`,
  revision: parse.revid,
  license: 'Derived from Wikipedia, CC BY-SA 4.0',
  districts: rows,
};
writeFileSync(new URL('../test/benchmark/districts.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
const count = (f) => rows.filter(f).length;
console.log(`${rows.length} districts: dev ${count((r) => r.split === 'dev')}, test ${count((r) => r.split === 'test')}, excluded ${count((r) => r.exclude)}`);
console.log('excluded:', rows.filter((r) => r.exclude).map((r) => r.rtgs).join(', '));
