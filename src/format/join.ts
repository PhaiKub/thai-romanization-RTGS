const VOWEL_START = /^[aeiou]/;
const VOWEL_END = /[aeiou]$/;

/**
 * RTGS hyphen rule: separate syllables where running them together reads another way —
 * before a syllable that starts with a vowel (สะอาด sa-at, แสงอรุณ saeng-arun)
 * and before `ng` after a vowel (สง่า sa-nga, which would otherwise read sang-a).
 */
export function needsHyphen(prev: string, next: string): boolean {
  if (!prev || !next) return false;
  return VOWEL_START.test(next) || (VOWEL_END.test(prev) && next.startsWith('ng'));
}

/** Join the syllables of one word. Empty syllables (fully silent) are skipped. */
export function joinSyllables(syllables: readonly string[], separator: string, hyphenateAmbiguous: boolean): string {
  let out = '';
  let prev = '';
  for (const syl of syllables) {
    if (!syl) continue;
    if (prev) out += hyphenateAmbiguous && separator === '' && needsHyphen(prev, syl) ? '-' : separator;
    out += syl;
    prev = syl;
  }
  return out;
}
