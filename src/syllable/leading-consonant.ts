import { isConsonant, isDependentMark, isToneMark, KARAN } from '../text/chars';
import { INITIAL } from '../transcribe/tables';
import type { Candidate } from './candidate';
import { COST } from './costs';

const SONORANTS: ReadonlySet<string> = new Set(['ง', 'ญ', 'น', 'ม', 'ย', 'ร', 'ล', 'ว']);
/** High- and mid-class consonants, the only ones that lead an อักษรนำ pair. */
export const LEADERS: ReadonlySet<string> = new Set([...'ขฃฉฐถผฝศษสหกจฎฏดตบปอ']);

/**
 * An open เ- syllable followed by a consonant carrying ิ, อ, ีย or ือ leaves those marks without their
 * เ: the เ really belongs to that consonant (เจริญ cha-roen, not เจ|ริญ; เสนอ sa-noe, not เส|นอ).
 */
export function strandsPreVowel(w: string, e: number): boolean {
  if (!isConsonant(w[e])) return false;
  let k = e + 1;
  if (isToneMark(w[k])) k++;
  const a = w[k];
  const b = w[k + 1];
  // เ-ิ always has a final (เจริญ, เฉลิม); an open ิ is its own syllable (เจติยา che-ti-ya, เอมิกา e-mi-ka).
  if (a === 'ิ') return isConsonant(b) && !isDependentMark(w[k + 2]);
  // ย with a karan is silent, not part of เ-ีย (เสนีย์ se-ni).
  if (a === 'ี') return b === 'ย' && w[k + 2] !== KARAN;
  return a === 'อ' || (a === 'ื' && b === 'อ');
}

/**
 * อักษรนำ written behind a pre-vowel: the pre-vowel belongs to the second consonant and the first is read
 * with an inferred a (เสด็จ sa-det, เฉลิม cha-loem, เผอิญ pha-oen).
 * `readRest` gives the plain syllable readings of a string from its first letter.
 */
export function leadingConsonantCandidates(
  w: string,
  i: number,
  pre: string,
  out: Candidate[],
  readRest: (s: string) => Candidate[],
): void {
  const c1 = w[i + 1];
  if (!pre || c1 === undefined || !LEADERS.has(c1) || !isConsonant(w[i + 2])) return;
  const lead: Candidate = {
    start: i + 1,
    end: i + 2,
    initial: { thai: c1, roman: INITIAL[c1] ?? '' },
    vowel: { thai: '', roman: 'a', implicit: true },
    final: { thai: '', roman: '' },
    silent: '',
    roman: `${INITIAL[c1] ?? ''}a`,
    rules: ['leading-consonant', 'implicit-a'],
    cost: 0,
    openEnd: false,
  };
  const extra = SONORANTS.has(w[i + 2] as string) ? COST.leadingConsonantSonorant : COST.leadingConsonant;
  // Read the rest as if the pre-vowel were written right before the second consonant.
  for (const second of readRest(pre + w.slice(i + 2))) {
    const end = i + 1 + second.end;
    out.push({
      ...lead,
      cost: COST.syllable + COST.implicitA + extra + second.cost,
      next: [{ ...second, start: i + 2, end, thai: pre + w.slice(i + 2, end) }],
    });
  }
}
