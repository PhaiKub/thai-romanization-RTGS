import type { AnalyzeResult, RomanizeOptions, SyllableResult } from './types';
import { Romanizer } from './romanizer';

export { Romanizer } from './romanizer';
export { Dictionary, DictionaryStack, parseRoman, type DictionaryEntry } from './dictionary/dictionary';
export { getBuiltinDictionary, BUILTIN_SOURCES } from './dictionary/builtin';
export { DEFAULT_OPTIONS, resolveOptions } from './options';
export { RTGS_TABLES } from './transcribe/tables';
export { normalizeThai } from './text/normalize';
export { isThai } from './text/chars';
export { hasIntlSegmenter } from './segment/segmenter';
export type * from './types';

export const VERSION = '0.1.0';

let shared: Romanizer | undefined;
function defaultRomanizer(): Romanizer {
  shared ??= new Romanizer();
  return shared;
}

/** Create a romanizer with its own default options and user dictionary. */
export function createRomanizer(config?: RomanizeOptions): Romanizer {
  return new Romanizer(config);
}

/**
 * Romanize Thai text with RTGS.
 * @example romanize('กรุงเทพมหานคร', { case: 'title' }) // 'Krung Thep Maha Nakhon'
 */
export function romanize(text: string, options?: RomanizeOptions): string {
  return defaultRomanizer().romanize(text, options);
}

/**
 * Romanize a personal name. Each space-separated part is read as one word (no word segmentation, which would
 * cut an unknown name into fragments) and the result is title-cased.
 * @example romanizeName('ธนกฤต สุขสวัสดิ์') // 'Thanakrit Suksawat'
 */
export function romanizeName(name: string, options?: RomanizeOptions): string {
  return defaultRomanizer().romanizeName(name, options);
}

/** Romanize and return every token, word and syllable with how each was read. */
export function analyze(text: string, options?: RomanizeOptions): AnalyzeResult {
  return defaultRomanizer().analyze(text, options);
}

/** Split one Thai word into syllables using the spelling rules only. */
export function syllabify(word: string): SyllableResult[] {
  return defaultRomanizer().syllabify(word);
}
