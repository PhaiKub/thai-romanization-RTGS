import type { SyllableRule } from '../types';
import { isConsonant, isDependentMark, isPreVowel, isRuLu, KARAN } from '../text/chars';
import { FINAL, NOT_FINAL, RU_AS_RUE_AFTER, INITIAL, withFinalWo, withFinalYo } from '../transcribe/tables';
import { COST } from './costs';
import { initialsAt } from './initials';
import { nucleiAt, type FinalMode } from './templates';

/** One possible reading of the letters `start … end-1` as a syllable. */
export interface Candidate {
  start: number;
  end: number;
  initial: { thai: string; roman: string };
  vowel: { thai: string; roman: string; implicit: boolean };
  final: { thai: string; roman: string };
  silent: string;
  roman: string;
  rules: SyllableRule[];
  cost: number;
  /** The syllable ends in a vowel that could also have taken a final (มา, โร, สี). */
  openEnd: boolean;
}

interface Coda {
  final: string;
  silent: string;
  end: number;
  cost: number;
  rules: SyllableRule[];
}

/**
 * Length of a silent karan tail at `r`: C์, Cิ์, Cุ์ and — only after a pronounced final — CC์, CCิ์
 * (จันทร์ chan, ศาสตร์ sat, สิทธิ์ sit, พันธุ์ phan).
 */
function karanTail(w: string, r: number, afterFinal: boolean): number {
  if (!isConsonant(w[r]) && !isRuLu(w[r])) return 0;
  const a = w[r + 1];
  if (a === KARAN) return 2;
  if ((a === 'ิ' || a === 'ุ') && w[r + 2] === KARAN) return 3;
  if (!afterFinal || !isConsonant(a)) return 0;
  const b = w[r + 2];
  if (b === KARAN) return 3;
  if ((b === 'ิ' || b === 'ุ') && w[r + 3] === KARAN) return 4;
  return 0;
}

function withTail(w: string, coda: Coda): Coda {
  const len = karanTail(w, coda.end, coda.final !== '');
  if (!len) return coda;
  return { ...coda, silent: coda.silent + w.slice(coda.end, coda.end + len), end: coda.end + len, rules: [...coda.rules, 'karan'] };
}

/**
 * Possible endings of a syllable whose vowel letters end at `p`.
 * `writtenVowel` allows a silent ร after the final (จักร, เพชร), which never follows an inferred vowel (นคร na-khon).
 */
function codasAt(w: string, p: number, mode: FinalMode, writtenVowel = true): Coda[] {
  const out: Coda[] = [];
  if (mode !== 'required') out.push({ final: '', silent: '', end: p, cost: 0, rules: [] });
  if (mode !== 'none') {
    let q = p;
    let silent = '';
    const rules: SyllableRule[] = [];
    // A karan-silenced letter between the vowel and the final: การ์ด kat, ฟิล์ม fim
    if (isConsonant(w[q]) && w[q + 1] === KARAN && isConsonant(w[q + 2])) {
      silent = w.slice(q, q + 2);
      rules.push('karan');
      q += 2;
    }
    const f = w[q];
    // A final ร followed by a ร that does not start the next syllable is ร หัน, read by the รร template (สวรรค์ sa-wan).
    const rorHan = f === 'ร' && w[q + 1] === 'ร' && !isDependentMark(w[q + 2]);
    if (f !== undefined && isConsonant(f) && !NOT_FINAL.has(f) && FINAL[f] !== undefined && !isDependentMark(w[q + 1]) && !rorHan) {
      out.push({ final: f, silent, end: q + 1, cost: 0, rules });
      // ร written after the final but not read: จักร chak, บุตร but, เพชร phet
      if (writtenVowel && w[q + 1] === 'ร' && !isDependentMark(w[q + 2])) {
        out.push({ final: f, silent: `${silent}ร`, end: q + 2, cost: COST.silentRor, rules: [...rules, 'silent-ror'] });
      }
    }
  }
  return out.map((c) => withTail(w, c));
}

function assemble(
  start: number,
  initial: { thai: string; roman: string },
  vowel: { thai: string; roman: string; implicit: boolean },
  coda: Coda,
  mode: FinalMode,
  baseCost: number,
  rules: SyllableRule[],
): Candidate | undefined {
  let finalRoman = '';
  if (coda.final === 'ย' || coda.final === 'ว') {
    // An inferred vowel never closes with ย/ว, and ัว/ว (ua) does not take ว.
    if (vowel.implicit || (coda.final === 'ว' && vowel.roman === 'ua')) return undefined;
    const merged = coda.final === 'ย' ? withFinalYo(vowel.roman) : withFinalWo(vowel.roman);
    if (merged.startsWith(vowel.roman)) {
      finalRoman = merged.slice(vowel.roman.length);
    } else {
      // เ-ย is the vowel เ-อ (oe) closed by ย: เลย loei
      vowel = { ...vowel, roman: merged.slice(0, -1) };
      finalRoman = merged.slice(-1);
    }
  } else if (coda.final) {
    finalRoman = FINAL[coda.final] ?? '';
  }
  return {
    start,
    end: coda.end,
    initial,
    vowel,
    final: { thai: coda.final, roman: finalRoman },
    silent: coda.silent,
    roman: initial.roman + vowel.roman + finalRoman,
    rules: [...rules, ...coda.rules],
    cost: COST.syllable + baseCost + coda.cost,
    openEnd: mode === 'optional' && coda.final === '' && coda.silent === '',
  };
}

/** ฤ / ฦ, alone or after a consonant (ฤดู rue-du, อังกฤษ ang-krit, พฤหัส phrue-hat). */
function ruLuCandidates(w: string, i: number, out: Candidate[]): void {
  const none = (end: number): Coda => ({ final: '', silent: '', end, cost: 0, rules: [] });
  const push = (c: Candidate | undefined) => {
    if (c) out.push(c);
  };
  const silentInitial = { thai: '', roman: '' };
  const c = w[i];
  if (c === 'ฦ') {
    const end = w[i + 1] === 'ๅ' ? i + 2 : i + 1;
    push(assemble(i, silentInitial, { thai: w.slice(i, end), roman: 'lue', implicit: false }, none(end), 'none', COST.ruLu, ['ru-lu']));
    return;
  }
  if (c === 'ฤ') {
    if (w[i + 1] === 'ๅ') {
      push(assemble(i, silentInitial, { thai: 'ฤๅ', roman: 'rue', implicit: false }, none(i + 2), 'none', COST.ruLu, ['ru-lu']));
      return;
    }
    for (const coda of codasAt(w, i + 1, 'none')) {
      push(assemble(i, silentInitial, { thai: 'ฤ', roman: 'rue', implicit: false }, coda, 'none', COST.ruLu, ['ru-lu']));
    }
    for (const coda of codasAt(w, i + 1, 'required')) {
      push(assemble(i, silentInitial, { thai: 'ฤ', roman: 'ri', implicit: false }, coda, 'required', COST.ruLu + 3, ['ru-lu']));
    }
    return;
  }
  if (c !== undefined && isConsonant(c) && w[i + 1] === 'ฤ') {
    const roman = RU_AS_RUE_AFTER.has(c) ? 'rue' : 'ri';
    for (const coda of codasAt(w, i + 2, 'optional')) {
      push(assemble(i, { thai: c, roman: INITIAL[c] ?? '' }, { thai: '-ฤ', roman, implicit: false }, coda, 'optional', COST.ruLu, ['ru-lu']));
    }
  }
}

/** All syllable readings that start at index `i` of word `w`. */
export function candidatesAt(w: string, i: number): Candidate[] {
  const out: Candidate[] = [];
  const pre = isPreVowel(w[i]) ? (w[i] as string) : '';
  const j = pre ? i + 1 : i;

  if (!pre) ruLuCandidates(w, i, out);

  // Word-initial บริ- is read bo-ri (บริษัท borisat, บริการ borikan), not as the cluster บร.
  if (i === 0 && w.startsWith('บริ')) {
    out.push({
      start: 0,
      end: 1,
      initial: { thai: 'บ', roman: 'b' },
      vowel: { thai: '', roman: 'o', implicit: true },
      final: { thai: '', roman: '' },
      silent: '',
      roman: 'bo',
      rules: ['implicit-o'],
      cost: COST.syllable,
      openEnd: false,
    });
  }

  for (const init of initialsAt(w, j)) {
    for (const nucleus of nucleiAt(w, init.end, pre)) {
      const vowel = { thai: nucleus.thai, roman: nucleus.roman, implicit: nucleus.implicit };
      const base = init.cost + nucleus.cost;
      const rules: SyllableRule[] = [];
      if (init.rule) rules.push(init.rule);
      if (nucleus.rule) rules.push(nucleus.rule);
      for (const coda of codasAt(w, nucleus.end, nucleus.final, !nucleus.implicit)) {
        let extra = 0;
        if (nucleus.rule === 'implicit-a') {
          if (coda.end >= w.length) extra += COST.implicitAWordEnd;
          if (i > 0) extra += COST.implicitAMidWord;
          if (init.rule === 'true-cluster') extra += COST.implicitAAfterCluster;
        }
        const cand = assemble(i, { thai: init.thai, roman: init.roman }, vowel, coda, nucleus.final, base + extra, rules);
        if (cand) out.push(cand);
      }
    }
  }
  return out;
}
