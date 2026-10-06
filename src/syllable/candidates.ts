import type { SyllableRule } from '../types';
import { isConsonant, isDependentMark, isPreVowel, isRuLu, isToneMark, KARAN } from '../text/chars';
import { FINAL, NOT_FINAL, RU_AS_ARUE_AFTER, RU_AS_RUE_AFTER, INITIAL, withFinalWo, withFinalYo } from '../transcribe/tables';
import { Dictionary } from '../dictionary/dictionary';
import { PREFIX_FORMS, STEM_FORMS, SUFFIX_FORMS } from '../dictionary/data/combining-forms';
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
  /** Spelling to report when it is not simply the letters start…end-1. */
  thai?: string;
  /** Further syllables read together with this one as a single parser step (combining forms, อักษรนำ before a pre-vowel). */
  next?: Candidate[];
}

const CLOSES_WITH_WO: ReadonlySet<string> = new Set(['a', 'i', 'e', 'ae', 'ia']);

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

/** ฤ / ฦ, alone or after a consonant (ฤดู rue-du, อังกฤษ ang-krit, พฤหัส phrue-hat). */
function ruLuCandidates(w: string, i: number, out: Candidate[]): void {
  const none = (end: number): Coda => ({ final: '', silent: '', end, cost: 0, rules: [] });
  const push = (c: Candidate | undefined) => {
    if (c) out.push(c);
  };
  const silentInitial = { thai: '', roman: '' };
  const c = w[i];
  if (c === 'ฦ') {
    const end = w[i + 1] === 'ๅ' || w[i + 1] === 'า' ? i + 2 : i + 1;
    push(assemble(i, silentInitial, { thai: w.slice(i, end), roman: 'lue', implicit: false }, none(end), 'none', COST.ruLu, ['ru-lu']));
    return;
  }
  if (c === 'ฤ') {
    // ฤา is a common spelling of ฤๅ (ฤาษี rue-si).
    if (w[i + 1] === 'ๅ' || w[i + 1] === 'า') {
      push(assemble(i, silentInitial, { thai: w.slice(i, i + 2), roman: 'rue', implicit: false }, none(i + 2), 'none', COST.ruLu, ['ru-lu']));
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
    const roman = RU_AS_ARUE_AFTER.has(c) ? 'arue' : RU_AS_RUE_AFTER.has(c) ? 'rue' : 'ri';
    for (const coda of codasAt(w, i + 2, 'optional')) {
      push(assemble(i, { thai: c, roman: INITIAL[c] ?? '' }, { thai: '-ฤ', roman, implicit: false }, coda, 'optional', COST.ruLu, ['ru-lu']));
    }
  }
}

const SONORANTS: ReadonlySet<string> = new Set(['ง', 'ญ', 'น', 'ม', 'ย', 'ร', 'ล', 'ว']);
/** High- and mid-class consonants, the only ones that lead an อักษรนำ pair. */
const LEADERS: ReadonlySet<string> = new Set([...'ขฃฉฐถผฝศษสหกจฎฏดตบปอ']);

/**
 * An open เ- syllable followed by a consonant carrying ิ, อ, ีย or ือ leaves those marks without their
 * เ: the เ really belongs to that consonant (เจริญ cha-roen, not เจ|ริญ; เสนอ sa-noe, not เส|นอ).
 */
function strandsPreVowel(w: string, e: number): boolean {
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

const prefixForms = new Dictionary(PREFIX_FORMS);
const suffixForms = new Dictionary(SUFFIX_FORMS);
const stemForms = new Dictionary(STEM_FORMS);

/** A run of syllables known only by their RTGS (from a combining form), as one parser step. */
export function romanRun(start: number, end: number, thai: string, romans: string[], cost: number, rule: SyllableRule = 'combining-form'): Candidate {
  const make = (roman: string, k: number): Candidate => ({
    start,
    end,
    initial: { thai: '', roman: '' },
    vowel: { thai: '', roman: '', implicit: false },
    final: { thai: '', roman: '' },
    silent: '',
    roman,
    rules: [rule],
    cost: 0,
    openEnd: false,
    thai: k === 0 ? thai : '',
  });
  const [first, ...rest] = romans.map(make) as [Candidate, ...Candidate[]];
  return { ...first, cost, next: rest };
}

function combiningFormCandidates(w: string, i: number, out: Candidate[]): void {
  const forms: [Dictionary, (end: number) => boolean][] = [
    [prefixForms, (end) => end < w.length && !isDependentMark(w[end])],
    [suffixForms, (end) => end === w.length && i > 0],
    [stemForms, (end) => end === w.length || !isDependentMark(w[end])],
  ];
  for (const [dict, fits] of forms) {
    for (const key of dict.matchesAt(w, i)) {
      const entry = dict.get(key);
      if (!entry || !fits(i + key.length)) continue;
      // A stem ending in ร never takes the first ร of ร หัน (วร|รณ would misread วรรณ wan).
      if (key.endsWith('ร') && w[i + key.length] === 'ร') continue;
      const romans = entry.words.flat();
      out.push(romanRun(i, i + key.length, key, romans, COST.combiningForm + romans.length * COST.syllable));
    }
  }
}

/**
 * อักษรนำ written behind a pre-vowel: the pre-vowel belongs to the second consonant and the first is read
 * with an inferred a (เสด็จ sa-det, เฉลิม cha-loem, เผอิญ pha-oen).
 */
function leadingConsonantCandidates(w: string, i: number, pre: string, out: Candidate[]): void {
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
  for (const second of candidatesAt(pre + w.slice(i + 2), 0, false)) {
    const end = i + 1 + second.end;
    out.push({
      ...lead,
      cost: COST.syllable + COST.implicitA + extra + second.cost,
      next: [{ ...second, start: i + 2, end, thai: pre + w.slice(i + 2, end) }],
    });
  }
}

/**
 * All syllable readings that start at index `i` of word `w`.
 * `compounds` adds multi-syllable steps (combining forms, อักษรนำ before a pre-vowel).
 * `wordStart` is true at the start of the word or right after a known morpheme (ภัทร|กมล): an inferred a is normal there.
 */
export function candidatesAt(w: string, i: number, compounds = true, wordStart = i === 0): Candidate[] {
  const out: Candidate[] = [];
  const pre = isPreVowel(w[i]) ? (w[i] as string) : '';
  const j = pre ? i + 1 : i;

  if (!pre) ruLuCandidates(w, i, out);
  if (compounds) {
    combiningFormCandidates(w, i, out);
    leadingConsonantCandidates(w, i, pre, out);
  }

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
        // Only an อักษรนำ leader can strand its เ (เจริญ); เนติมา ne-ti-ma and เมวิกา me-wi-ka are plain open syllables.
        const stranded = nucleus.thai === 'เ-' && coda.final === '' && coda.silent === '' && LEADERS.has(init.thai) && strandsPreVowel(w, coda.end);
        if (stranded) continue;
        let extra = 0;
        if (nucleus.rule === 'implicit-a') {
          if (coda.end >= w.length) extra += COST.implicitAWordEnd;
          if (!wordStart) extra += COST.implicitAMidWord;
          if (init.rule === 'true-cluster') extra += COST.implicitAAfterCluster;
        }
        const cand = assemble(i, { thai: init.thai, roman: init.roman }, vowel, coda, nucleus.final, base + extra, rules);
        if (cand) out.push(cand);
      }
    }
  }
  return out;
}
