/**
 * Thai Unicode block (U+0E00–U+0E7F) character classes.
 * Every Thai character is a single UTF-16 code unit, so plain string indexing is safe.
 */

/** ก (U+0E01) … ฮ (U+0E2E). Includes ฤ and ฦ, which behave as vowels; see {@link isRuLu}. */
export function isConsonant(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return c >= 0x0e01 && c <= 0x0e2e && ch !== 'ฤ' && ch !== 'ฦ';
}

/** ฤ and ฦ — written like consonants but pronounced as syllables (rue / lue). */
export function isRuLu(ch: string | undefined): boolean {
  return ch === 'ฤ' || ch === 'ฦ';
}

/** Vowels written before the initial consonant: เ แ โ ใ ไ */
export function isPreVowel(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return c >= 0x0e40 && c <= 0x0e44;
}

/** Vowels written above or below the initial consonant, plus mai taikhu (็). */
export function isAboveBelowVowel(ch: string | undefined): boolean {
  return ch !== undefined && 'ัิีึืุู็'.includes(ch) && ch.length === 1;
}

/** Vowels written after the initial consonant that can never begin a syllable. */
export function isFollowingVowel(ch: string | undefined): boolean {
  return ch === 'ะ' || ch === 'า' || ch === 'ำ' || ch === 'ๅ';
}

/** Tone marks: ่ ้ ๊ ๋ */
export function isToneMark(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return c >= 0x0e48 && c <= 0x0e4b;
}

/** Thanthakhat / karan (์), marks a silent letter. */
export const KARAN = '์';
export const MAI_YAMOK = 'ๆ';
export const PAIYANNOI = 'ฯ';

/** Marks that must attach to a preceding consonant; a syllable can never start with one. */
export function isDependentMark(ch: string | undefined): boolean {
  return isAboveBelowVowel(ch) || isToneMark(ch) || isFollowingVowel(ch) || ch === KARAN;
}

export function isThaiDigit(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return c >= 0x0e50 && c <= 0x0e59;
}

/** Letters that make up Thai words (consonants, vowels, tone marks, signs), excluding ๆ ฯ digits and symbols. */
export function isThaiLetter(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return (c >= 0x0e01 && c <= 0x0e2e) || (c >= 0x0e30 && c <= 0x0e3a) || (c >= 0x0e40 && c <= 0x0e45) || (c >= 0x0e47 && c <= 0x0e4e);
}

/** True if the string contains at least one Thai letter. */
export function isThai(text: string): boolean {
  for (const ch of text) if (isThaiLetter(ch)) return true;
  return false;
}

export function thaiDigitToArabic(text: string): string {
  return text.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));
}
