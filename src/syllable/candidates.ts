import type { SyllableRule } from '../types';
import { isPreVowel } from '../text/chars';
import type { Candidate } from './candidate';
import { assemble, codasAt } from './codas';
import { combiningFormCandidates } from './combining-forms';
import { COST } from './costs';
import { initialsAt } from './initials';
import { leadingConsonantCandidates, LEADERS, strandsPreVowel } from './leading-consonant';
import { ruLuCandidates } from './ru-lu';
import { nucleiAt } from './templates';

export { romanRun, type Candidate } from './candidate';

/**
 * All syllable readings that start at index `i` of word `w`: the spelling templates
 * (initial → vowel → final, see initials.ts, templates.ts, codas.ts) plus the special readings in
 * ru-lu.ts, combining-forms.ts and leading-consonant.ts.
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
    leadingConsonantCandidates(w, i, pre, out, (s) => candidatesAt(s, 0, false));
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
