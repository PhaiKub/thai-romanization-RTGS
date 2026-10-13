import { isDependentMark } from '../text/chars';
import { Dictionary } from '../dictionary/dictionary';
import { PREFIX_FORMS, STEM_FORMS, SUFFIX_FORMS } from '../dictionary/data/combining-forms';
import { romanRun, type Candidate } from './candidate';
import { COST } from './costs';

const prefixForms = new Dictionary(PREFIX_FORMS);
const suffixForms = new Dictionary(SUFFIX_FORMS);
const stemForms = new Dictionary(STEM_FORMS);

/** Pali/Sanskrit stems read with their linking syllable (ธน|กฤต tha-na-krit); see dictionary/data/combining-forms.ts. */
export function combiningFormCandidates(w: string, i: number, out: Candidate[]): void {
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
