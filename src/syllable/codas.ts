import type { SyllableRule } from '../types';
import { isConsonant, isDependentMark, isRuLu, KARAN } from '../text/chars';
import { FINAL, NOT_FINAL, withFinalWo, withFinalYo } from '../transcribe/tables';
import type { Candidate } from './candidate';
import { COST } from './costs';
import type { FinalMode } from './templates';

/** How a syllable ends after its vowel letters: the final, letters written but not read, and their cost. */
export interface Coda {
  final: string;
  silent: string;
  end: number;
  cost: number;
  rules: SyllableRule[];
}

const CLOSES_WITH_WO: ReadonlySet<string> = new Set(['a', 'i', 'e', 'ae', 'ia']);

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
  // Two silent consonants (ศาสตร์, จันทร์) are rarer than one: when the first could start its own
  // syllable instead (มโน|รมย์ manorom, not มโนร|มย์), that reading should be able to win.
  const twoSilent = isConsonant(w[coda.end + 1]);
  return {
    ...coda,
    silent: coda.silent + w.slice(coda.end, coda.end + len),
    end: coda.end + len,
    cost: coda.cost + (twoSilent ? COST.twoSilentKaran : 0),
    rules: [...coda.rules, 'karan'],
  };
}

/**
 * Possible endings of a syllable whose vowel letters end at `p`.
 * `writtenVowel` allows a silent ร after the final (จักร, เพชร), which never follows an inferred vowel (นคร na-khon).
 */
export function codasAt(w: string, p: number, mode: FinalMode, writtenVowel = true): Coda[] {
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
    // Pali/Sanskrit final written with a vowel that is not read: ปฏิวัติ -wat, พัฒิ phat, เหตุ het.
    const mute = w[q + 1];
    if (
      writtenVowel && f !== undefined && isConsonant(f) && !NOT_FINAL.has(f) && FINAL[f] !== undefined &&
      (mute === 'ิ' || mute === 'ุ') && !isDependentMark(w[q + 2])
    ) {
      out.push({ final: f, silent: `${silent}${mute}`, end: q + 2, cost: COST.silentFinalVowel, rules: [...rules, 'silent-vowel'] });
    }
  }
  return out.map((c) => withTail(w, c));
}

/** Build a syllable from its parts, merging a final ย/ว into the vowel. Undefined when the parts cannot combine. */
export function assemble(
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
    // An inferred vowel never closes with ย/ว, and only a, i, e, ae and ia close with ว (-าว -ิว เ-ว แ-ว เ-ียว).
    if (vowel.implicit || (coda.final === 'ว' && !CLOSES_WITH_WO.has(vowel.roman))) return undefined;
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
