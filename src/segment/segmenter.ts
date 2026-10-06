import type { SegmenterOption } from '../types';
import type { DictionaryStack } from '../dictionary/dictionary';
import { isDependentMark, isPreVowel } from '../text/chars';

interface IntlSegmenterLike {
  segment(input: string): Iterable<{ segment: string }>;
}

let intlSegmenter: IntlSegmenterLike | null | undefined;

function getIntlSegmenter(): IntlSegmenterLike | null {
  if (intlSegmenter === undefined) {
    const Ctor = (Intl as unknown as { Segmenter?: new (locale: string, opts: { granularity: 'word' }) => IntlSegmenterLike }).Segmenter;
    intlSegmenter = Ctor ? new Ctor('th', { granularity: 'word' }) : null;
  }
  return intlSegmenter;
}

/** Whether `Intl.Segmenter` is available in this runtime. */
export function hasIntlSegmenter(): boolean {
  return getIntlSegmenter() !== null;
}

/** Most segments a dictionary word may be glued back from. */
const MAX_MERGE = 8;

/** Rejoin neighbouring segments whose concatenation is a dictionary word (กรุง|เทพ → กรุงเทพ). */
function mergeWithDictionary(segments: string[], dict: DictionaryStack): string[] {
  const out: string[] = [];
  for (let i = 0; i < segments.length; ) {
    let taken = 1;
    let joined = segments[i] as string;
    let acc = joined;
    for (let j = i + 1; j < Math.min(segments.length, i + MAX_MERGE); j++) {
      acc += segments[j];
      if (acc.length > dict.maxLength) break;
      if (dict.get(acc)) {
        joined = acc;
        taken = j - i + 1;
      }
    }
    out.push(joined);
    i += taken;
  }
  return out;
}

/** A dictionary word may only start where a syllable can start. */
function canStartWord(text: string, i: number): boolean {
  return !isDependentMark(text[i]) && !isPreVowel(text[i - 1]);
}

/** Longest-match segmentation using only the dictionary; text between matches stays as one word. */
function segmentByDictionary(run: string, dict: DictionaryStack): string[] {
  const out: string[] = [];
  let pending = '';
  for (let i = 0; i < run.length; ) {
    const match = canStartWord(run, i) ? dict.longestMatchAt(run, i, 2) : undefined;
    const end = match ? i + match.length : 0;
    if (match && canStartWord(run, end)) {
      if (pending) out.push(pending);
      pending = '';
      out.push(match);
      i = end;
    } else {
      pending += run[i];
      i++;
    }
  }
  if (pending) out.push(pending);
  return out;
}

/** Most neighbouring segments rejoined into one word. */
const MAX_GROUP = 4;
/** Cost of rejoining two segments, so that a tie keeps the segmenter's boundary. */
const JOIN_PENALTY = 1;
/**
 * A segment whose own reading costs this much cannot be a word by itself: it ends in an inferred a
 * (น alone) or has a letter no syllable fits (า alone). See syllable/costs.ts.
 */
const FRAGMENT_COST = 40;

/**
 * ICU knows dictionary words but cuts unknown ones into fragments: จินนา → จิ|น|นา, ชนิดา → ชนิด|า.
 * Rejoin a fragment with its neighbours when reading them as one word costs less. Segments that read
 * fine alone are never rejoined, since joining real words lets a cheaper misreading win (ที่|สนาม).
 */
function rejoinFragments(segments: string[], wordCost: (word: string) => number): string[] {
  const n = segments.length;
  const fragment = segments.map((s) => wordCost(s) >= FRAGMENT_COST);
  const best = new Array<number>(n + 1).fill(Infinity);
  const from = new Array<number>(n + 1).fill(0);
  best[0] = 0;
  for (let i = 0; i < n; i++) {
    let word = '';
    let hasFragment = false;
    for (let k = 1; k <= MAX_GROUP && i + k <= n; k++) {
      word += segments[i + k - 1];
      hasFragment ||= fragment[i + k - 1] as boolean;
      if (k > 1 && !hasFragment) continue;
      const total = (best[i] as number) + wordCost(word) + JOIN_PENALTY * (k - 1);
      if (total < (best[i + k] as number)) {
        best[i + k] = total;
        from[i + k] = i;
      }
    }
  }
  const out: string[] = [];
  for (let at = n; at > 0; at = from[at] as number) out.push(segments.slice(from[at], at).join(''));
  return out.reverse();
}

/**
 * Split one run of Thai letters into words.
 * `wordCost` (the syllable parser's cost of reading a string as one word) lets `intl` mode rejoin fragments.
 */
export function segmentThai(run: string, mode: SegmenterOption, dict: DictionaryStack, wordCost?: (word: string) => number): string[] {
  if (typeof mode === 'function') {
    const parts = mode(run).filter((p) => p.length > 0);
    return parts.join('') === run ? parts : [run];
  }
  if (mode === 'none') return [run];
  if (mode === 'intl') {
    const seg = getIntlSegmenter();
    if (seg) {
      const segments = mergeWithDictionary([...seg.segment(run)].map((s) => s.segment), dict);
      return wordCost && segments.length > 1 ? rejoinFragments(segments, wordCost) : segments;
    }
  }
  return segmentByDictionary(run, dict);
}
