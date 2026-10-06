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

/** Split one run of Thai letters into words. */
export function segmentThai(run: string, mode: SegmenterOption, dict: DictionaryStack): string[] {
  if (typeof mode === 'function') {
    const parts = mode(run).filter((p) => p.length > 0);
    return parts.join('') === run ? parts : [run];
  }
  if (mode === 'none') return [run];
  if (mode === 'intl') {
    const seg = getIntlSegmenter();
    if (seg) {
      const segments = [...seg.segment(run)].map((s) => s.segment);
      return mergeWithDictionary(segments, dict);
    }
  }
  return segmentByDictionary(run, dict);
}
