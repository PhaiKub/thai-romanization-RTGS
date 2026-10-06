import type { SyllableRule } from '../types';
import { isConsonant, isPreVowel } from '../text/chars';
import { FALSE_CLUSTERS, INITIAL, LEADING_H_TARGETS, LOAN_CLUSTERS, TRUE_CLUSTERS } from '../transcribe/tables';
import { COST } from './costs';

export interface InitialOption {
  thai: string;
  roman: string;
  /** Index after the initial. */
  end: number;
  cost: number;
  rule?: SyllableRule;
}

/**
 * ร before ิ ุ ู is read: สรุป sa-rup, ศรุตา sa-ru-ta.
 */
const SPLITS_FALSE_CLUSTER = /^[ิุู]/;

/** The four words spelled with อ นำ ย: อย่า อยู่ อย่าง อยาก */
const LEADING_O_REST = /^(?:่า|ู่|าก)/;

/** Every way the letters at `j` can be read as a syllable-initial consonant (single, cluster, or with a silent leader). */
export function initialsAt(w: string, j: number): InitialOption[] {
  const c = w[j];
  if (!isConsonant(c) || c === undefined) return [];
  const out: InitialOption[] = [{ thai: c, roman: INITIAL[c] ?? '', end: j + 1, cost: 0 }];

  const d = w[j + 1];
  if (!isConsonant(d) || d === undefined) return out;
  const pair = c + d;

  if (TRUE_CLUSTERS.has(pair)) {
    out.push({ thai: pair, roman: (INITIAL[c] ?? '') + (INITIAL[d] ?? ''), end: j + 2, cost: LOAN_CLUSTERS.has(pair) ? COST.loanCluster : 0, rule: 'true-cluster' });
  } else if (
    FALSE_CLUSTERS.has(pair) &&
    // จร is a false cluster only in จริง (เจริญ is cha-roen). After a pre-vowel the ิ belongs to เ-ิ (เสริม soem).
    (pair === 'จร' ? w.startsWith('จริง', j) : !SPLITS_FALSE_CLUSTER.test(w.slice(j + 2)) || isPreVowel(w[j - 1]))
  ) {
    out.push({ thai: pair, roman: INITIAL[c] ?? '', end: j + 2, cost: COST.falseCluster, rule: 'false-cluster' });
  } else if (pair === 'ทร') {
    out.push({ thai: pair, roman: 's', end: j + 2, cost: COST.thorRorS, rule: 'thor-ror' });
    out.push({ thai: pair, roman: 'thr', end: j + 2, cost: COST.thorRorThr, rule: 'true-cluster' });
  } else if (c === 'ห' && LEADING_H_TARGETS.has(d)) {
    out.push({ thai: pair, roman: INITIAL[d] ?? '', end: j + 2, cost: 0, rule: 'leading-h' });
  } else if (pair === 'อย' && LEADING_O_REST.test(w.slice(j + 2))) {
    out.push({ thai: pair, roman: 'y', end: j + 2, cost: 0, rule: 'leading-o' });
  }
  return out;
}
