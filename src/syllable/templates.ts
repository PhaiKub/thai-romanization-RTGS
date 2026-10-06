import type { SyllableRule } from '../types';
import { isAboveBelowVowel, isToneMark } from '../text/chars';
import { COST } from './costs';

export type FinalMode = 'none' | 'optional' | 'required';

/** The vowel of a syllable: what follows the initial, up to where a final consonant would start. */
export interface Nucleus {
  /** Spelling with `-` for the initial, e.g. `เ-ีย`; empty when the vowel is not written. */
  thai: string;
  roman: string;
  /** Index after the vowel letters. */
  end: number;
  final: FinalMode;
  cost: number;
  implicit: boolean;
  rule?: SyllableRule;
}

function v(thai: string, roman: string, end: number, final: FinalMode, cost = 0, rule?: SyllableRule): Nucleus {
  return rule ? { thai, roman, end, final, cost, implicit: false, rule } : { thai, roman, end, final, cost, implicit: false };
}

/**
 * Vowel templates that can follow an initial ending at `k`, given the pre-vowel (เ แ โ ใ ไ or '').
 * A tone mark may sit right after the initial or after an above/below vowel; it is skipped here.
 */
export function nucleiAt(w: string, k: number, pre: string): Nucleus[] {
  let p = k;
  const ab = isAboveBelowVowel(w[p]) ? (w[p] as string) : '';
  if (ab) p++;
  if (isToneMark(w[p])) p++;
  const x = w[p];
  const y = w[p + 1];

  switch (pre) {
    case '':
      switch (ab) {
        case '': {
          if (x === 'ะ') return [v('-ะ', 'a', p + 1, 'none')];
          if (x === 'า') return [v('-า', 'a', p + 1, 'optional')];
          if (x === 'ำ') return [v('-ำ', 'am', p + 1, 'none')];
          const out: Nucleus[] = [];
          if (x === 'อ') out.push(v('-อ', 'o', p + 1, 'optional'));
          if (x === 'ว') out.push(v('-ว-', 'ua', p + 1, 'required', COST.woVowel, 'wo-vowel'));
          if (x === 'ร' && y === 'ร') {
            out.push(v('-รร-', 'a', p + 2, 'required', 0, 'ror-han'));
            out.push(v('-รร', 'an', p + 2, 'none', 0, 'ror-han'));
          }
          out.push({ thai: '', roman: 'o', end: p, final: 'required', cost: COST.implicitO, implicit: true, rule: 'implicit-o' });
          out.push({ thai: '', roman: 'a', end: p, final: 'none', cost: COST.implicitA, implicit: true, rule: 'implicit-a' });
          return out;
        }
        case 'ั':
          if (x === 'ว') return y === 'ะ' ? [v('-ัวะ', 'ua', p + 2, 'none')] : [v('-ัว', 'ua', p + 1, 'optional')];
          return [v('-ั', 'a', p, 'required')];
        case 'ิ':
          return [v('-ิ', 'i', p, 'optional')];
        case 'ี':
          return [v('-ี', 'i', p, 'optional')];
        case 'ึ':
          return [v('-ึ', 'ue', p, 'optional')];
        case 'ื':
          return x === 'อ' ? [v('-ือ', 'ue', p + 1, 'optional'), v('-ื', 'ue', p, 'required')] : [v('-ื', 'ue', p, 'required')];
        case 'ุ':
          return [v('-ุ', 'u', p, 'optional')];
        case 'ู':
          return [v('-ู', 'u', p, 'optional')];
        case '็':
          return x === 'อ' ? [v('-็อ', 'o', p + 1, 'optional')] : [v('-็', 'o', p, 'none', COST.maiTaikhuO)];
      }
      return [];

    case 'เ':
      switch (ab) {
        case '':
          if (x === 'ะ') return [v('เ-ะ', 'e', p + 1, 'none')];
          if (x === 'า') return y === 'ะ' ? [v('เ-าะ', 'o', p + 2, 'none')] : [v('เ-า', 'ao', p + 1, 'none')];
          if (x === 'อ') return y === 'ะ' ? [v('เ-อะ', 'oe', p + 2, 'none')] : [v('เ-อ', 'oe', p + 1, 'optional')];
          return [v('เ-', 'e', p, 'optional')];
        case 'ี':
          if (x !== 'ย') return [];
          return y === 'ะ' ? [v('เ-ียะ', 'ia', p + 2, 'none')] : [v('เ-ีย', 'ia', p + 1, 'optional')];
        case 'ื':
          if (x !== 'อ') return [];
          return y === 'ะ' ? [v('เ-ือะ', 'uea', p + 2, 'none')] : [v('เ-ือ', 'uea', p + 1, 'optional')];
        case 'ิ':
          return [v('เ-ิ', 'oe', p, 'required')];
        case '็':
          return [v('เ-็', 'e', p, 'required')];
      }
      return [];

    case 'แ':
      if (ab === '') return x === 'ะ' ? [v('แ-ะ', 'ae', p + 1, 'none')] : [v('แ-', 'ae', p, 'optional')];
      if (ab === '็') return [v('แ-็', 'ae', p, 'required')];
      return [];

    case 'โ':
      if (ab === '') return x === 'ะ' ? [v('โ-ะ', 'o', p + 1, 'none')] : [v('โ-', 'o', p, 'optional')];
      return [];

    case 'ใ':
      return ab === '' ? [v('ใ-', 'ai', p, 'none')] : [];

    case 'ไ':
      if (ab !== '') return [];
      return x === 'ย' ? [v('ไ-', 'ai', p, 'none'), v('ไ-ย', 'ai', p + 1, 'none', COST.silentYo, 'silent-yo')] : [v('ไ-', 'ai', p, 'none')];
  }
  return [];
}
