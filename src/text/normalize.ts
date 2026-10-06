import { isAboveBelowVowel, isToneMark } from './chars';

const INVISIBLE = /[​-‍⁠﻿­]/g;
/** Phinthu (ฺ) and yamakkan (๎) are Pali/Sanskrit reading aids that carry no RTGS sound. */
const PALI_MARKS = /[ฺ๎]/g;

/**
 * Fix the most common ways the same Thai text gets typed differently, so the parser sees one spelling:
 * - Unicode NFC, invisible characters removed
 * - nikhahit + sara aa (ํา) → sara am (ำ), keeping any tone mark before it
 * - two sara e (เเ) → sara ae (แ)
 * - tone mark or karan typed before an above/below vowel is moved after it (ก่ิ → กิ่)
 * - repeated identical marks collapsed (ก่่ → ก่)
 */
export function normalizeThai(text: string): string {
  let s = text.normalize('NFC').replace(INVISIBLE, '').replace(PALI_MARKS, '');
  s = s.replace(/ํ([่-๋]?)า/g, '$1ำ');
  s = s.replace(/เเ/g, 'แ');

  const out: string[] = [];
  for (const ch of s) {
    const prev = out[out.length - 1];
    if (prev === ch && (isToneMark(ch) || isAboveBelowVowel(ch) || ch === '์')) continue;
    if (isAboveBelowVowel(ch) && prev !== undefined && (isToneMark(prev) || prev === '์')) {
      out.splice(out.length - 1, 0, ch);
      continue;
    }
    out.push(ch);
  }
  return out.join('');
}
