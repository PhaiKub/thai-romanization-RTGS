import type { SyllableResult } from '../types';
import type { Dictionary } from '../dictionary/dictionary';
import { isConsonant, isDependentMark } from '../text/chars';
import { FINAL, INITIAL, NOT_FINAL } from '../transcribe/tables';
import { candidatesAt, romanRun, type Candidate } from './candidates';
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

/** Shortest dictionary word used inside a longer word (shorter ones like ณ or ก็ would match by accident). */
const MIN_IN_WORD_LENGTH = 3;

/** Single-word dictionary entries that start at `i` and end on a syllable boundary (เดือน|จรัส, ชัย|โชติ). */
function lexiconCandidates(w: string, i: number, lexicon: Dictionary): Candidate[] {
  const out: Candidate[] = [];
  for (const key of lexicon.matchesAt(w, i)) {
    const end = i + key.length;
    const entry = lexicon.get(key);
    if (!entry || key.length < MIN_IN_WORD_LENGTH || entry.words.length !== 1) continue;
    if (end < w.length && isDependentMark(w[end])) continue;
    const romans = entry.words[0] as string[];
    out.push(romanRun(i, end, key, romans, romans.length * COST.syllable + COST.inWordDictionary, 'dictionary'));
  }
  return out;
}

function couldBeFinal(ch: string | undefined): boolean {
  return ch !== undefined && isConsonant(ch) && !NOT_FINAL.has(ch) && FINAL[ch] !== undefined;
}

/**
 * Split one Thai word into syllables: the lowest-cost path through all template matches (see `costs.ts`).
 * The path state also remembers whether the previous syllable ended in an open vowel, so an inferred-vowel
 * syllable that steals that vowel's possible final pays `implicitAfterOpen`.
 * Always returns a result — letters no template accepts are read alone.
 * With a `lexicon`, its words are also candidates inside the word, so a known part of a compound is read
 * as the dictionary says.
 */
export function parseWithCost(word: string, lexicon?: Dictionary): { syllables: Candidate[]; cost: number } {
  const n = word.length;
  // State of the path at a position: how the previous step ended.
  const CLOSED = 0;
  const OPEN = 1; // an open vowel that could have taken the next letter as its final
  const BOUNDARY = 2; // a known morpheme (combining form or dictionary word): the rest reads like a new word
  const STATES = 3;
  const best = new Array<number>((n + 1) * STATES).fill(Infinity);
  const via = new Array<{ cand: Candidate; from: number } | undefined>((n + 1) * STATES);
  best[0] = 0;

  const stepsAt = (i: number, wordStart: boolean): Candidate[] => [
    ...candidatesAt(word, i, true, wordStart),
    ...(lexicon ? lexiconCandidates(word, i, lexicon) : []),
    fallback(word, i),
  ];

  for (let i = 0; i < n; i++) {
    let midWord: Candidate[] | undefined;
    for (let state = 0; state < STATES; state++) {
      const from = i * STATES + state;
      const here = best[from] as number;
      if (here === Infinity) continue;
      const cands = state === BOUNDARY || i === 0 ? stepsAt(i, true) : (midWord ??= stepsAt(i, false));
      for (const c of cands) {
        let total = here + c.cost;
        // A true cluster keeps its first letter (ศิริ|พรม), so it is not "stealing" the open syllable's final.
        const cluster = c.rules.includes('true-cluster');
        if (state === OPEN && c.vowel.implicit && !cluster && couldBeFinal(word[i])) total += COST.implicitAfterOpen;
        const last = c.next?.length ? (c.next[c.next.length - 1] as Candidate) : c;
        const morpheme = last.rules.includes('combining-form') || last.rules.includes('dictionary');
        const next = morpheme ? BOUNDARY : last.openEnd ? OPEN : CLOSED;
        const to = last.end * STATES + next;
        if (total < (best[to] as number)) {
          best[to] = total;
          via[to] = { cand: c, from };
        }
      }
    }
  }

  let at = n * STATES;
  for (let state = 1; state < STATES; state++) {
    if ((best[n * STATES + state] as number) < (best[at] as number)) at = n * STATES + state;
  }
  const cost = best[at] as number;
  const out: Candidate[] = [];
  while (at >= STATES) {
    const step = via[at] as { cand: Candidate; from: number };
    // Pushed in reverse, then the whole list is reversed: the step's own syllable comes first.
    out.push(...[step.cand, ...(step.cand.next ?? [])].reverse());
    at = step.from;
  }
  return { syllables: out.reverse(), cost };
}

/** Syllables of a word (see {@link parseWithCost}). */
export function parseSyllables(word: string, lexicon?: Dictionary): Candidate[] {
  return parseWithCost(word, lexicon).syllables;
}

export function toSyllableResult(word: string, c: Candidate): SyllableResult {
  return {
    thai: c.thai ?? word.slice(c.start, c.end),
    roman: c.roman,
    initial: c.initial,
    vowel: c.vowel,
    final: c.final,
    silent: c.silent,
    rules: c.rules,
  };
}

/** Syllables of a single (normalized) Thai word, read by rule only. */
export function syllabify(word: string, lexicon?: Dictionary): SyllableResult[] {
  return parseSyllables(word, lexicon).map((c) => toSyllableResult(word, c));
}
