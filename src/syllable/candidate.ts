import type { SyllableRule } from '../types';

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

/** A run of syllables known only by their RTGS (a combining form or dictionary word), as one parser step. */
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
