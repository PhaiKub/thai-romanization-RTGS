import type { SyllableResult } from '../types';
import { isConsonant } from '../text/chars';
import { FINAL, INITIAL, NOT_FINAL } from '../transcribe/tables';
import { candidatesAt, type Candidate } from './candidates';
import { COST } from './costs';

/** Sound of a letter read on its own, used only when no syllable template fits. */
const LONE_SOUND: Readonly<Record<string, string>> = {
  'ะ': 'a', 'ั': 'a', 'า': 'a', 'ำ': 'am', 'ิ': 'i', 'ี': 'i', 'ึ': 'ue', 'ื': 'ue', 'ุ': 'u', 'ู': 'u',
  'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai', 'ฤ': 'rue', 'ฦ': 'lue',
};

function fallback(w: string, i: number): Candidate {
  const ch = w[i] as string;
  const roman = LONE_SOUND[ch] ?? INITIAL[ch] ?? '';
  return {
    start: i,
    end: i + 1,
    initial: { thai: '', roman: '' },
    vowel: { thai: '', roman: '', implicit: false },
    final: { thai: '', roman: '' },
    silent: roman ? '' : ch,
    roman,
    rules: ['fallback'],
    cost: COST.fallback,
    openEnd: false,
  };
}

function couldBeFinal(ch: string | undefined): boolean {
  return ch !== undefined && isConsonant(ch) && !NOT_FINAL.has(ch) && FINAL[ch] !== undefined;
}

/**
 * Split one Thai word into syllables: the lowest-cost path through all template matches (see `costs.ts`).
 * The path state also remembers whether the previous syllable ended in an open vowel, so an inferred-vowel
 * syllable that steals that vowel's possible final pays `implicitAfterOpen`.
 * Always returns a result — letters no template accepts are read alone.
 */
export function parseSyllables(word: string): Candidate[] {
  const n = word.length;
  // best[pos * 2 + open]
  const best = new Array<number>((n + 1) * 2).fill(Infinity);
  const via = new Array<{ cand: Candidate; from: number } | undefined>((n + 1) * 2);
  best[0] = 0;

  for (let i = 0; i < n; i++) {
    const cands = [...candidatesAt(word, i), fallback(word, i)];
    for (let open = 0; open < 2; open++) {
      const from = i * 2 + open;
      const here = best[from] as number;
      if (here === Infinity) continue;
      for (const c of cands) {
        let total = here + c.cost;
        if (open && c.vowel.implicit && couldBeFinal(word[i])) total += COST.implicitAfterOpen;
        const to = c.end * 2 + (c.openEnd ? 1 : 0);
        if (total < (best[to] as number)) {
          best[to] = total;
          via[to] = { cand: c, from };
        }
      }
    }
  }

  let at = (best[n * 2] as number) <= (best[n * 2 + 1] as number) ? n * 2 : n * 2 + 1;
  const out: Candidate[] = [];
  while (at > 1) {
    const step = via[at] as { cand: Candidate; from: number };
    out.push(step.cand);
    at = step.from;
  }
  return out.reverse();
}

export function toSyllableResult(word: string, c: Candidate): SyllableResult {
  return {
    thai: word.slice(c.start, c.end),
    roman: c.roman,
    initial: c.initial,
    vowel: c.vowel,
    final: c.final,
    silent: c.silent,
    rules: c.rules,
  };
}

/** Syllables of a single (normalized) Thai word, read by rule only. */
export function syllabify(word: string): SyllableResult[] {
  return parseSyllables(word).map((c) => toSyllableResult(word, c));
}
