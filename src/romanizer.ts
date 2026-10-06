import type {
  AnalyzeResult,
  Confidence,
  ResolvedOptions,
  RomanizeOptions,
  SyllableResult,
  TokenResult,
  Warning,
  WordResult,
} from './types';
import { Dictionary, DictionaryStack, type DictionaryEntry } from './dictionary/dictionary';
import { getBuiltinDictionary } from './dictionary/builtin';
import { applyCase, capitalize } from './format/casing';
import { joinSyllables } from './format/join';
import { resolveOptions } from './options';
import { segmentThai } from './segment/segmenter';
import { syllabify as parseWord } from './syllable/parse';
import { thaiDigitToArabic } from './text/chars';
import { normalizeThai } from './text/normalize';
import { tokenize } from './text/tokenize';

interface RuleWord {
  syllables: SyllableResult[];
  confidence: Confidence;
  unparsed: string[];
}

const CACHE_LIMIT = 20_000;
const SENTENCE_END = /[.!?…]\s*$/;

function confidenceOf(syllables: SyllableResult[]): Confidence {
  if (syllables.some((s) => s.rules.includes('fallback'))) return 'low';
  if (syllables.some((s) => s.vowel.implicit)) return 'medium';
  return 'high';
}

function dictionarySyllables(entry: DictionaryEntry): SyllableResult[] {
  const all = entry.words.flat();
  return all.map((roman) => ({
    thai: all.length === 1 ? entry.thai : '',
    roman,
    initial: { thai: '', roman: '' },
    vowel: { thai: '', roman: '', implicit: false },
    final: { thai: '', roman: '' },
    silent: '',
    rules: [],
  }));
}

/**
 * Thai → RTGS converter with its own user dictionary and per-word cache.
 * Create one and reuse it; the module-level `romanize()` uses a shared default instance.
 */
export class Romanizer {
  /** Words added with `addWord`/`addWords` or the `dictionary` constructor option. Searched before the built-in dictionary. */
  readonly userDictionary: Dictionary;
  private readonly defaults: RomanizeOptions;
  private readonly cache = new Map<string, RuleWord>();

  constructor(config: RomanizeOptions = {}) {
    const { dictionary, ...rest } = config;
    resolveOptions(rest);
    this.defaults = rest;
    this.userDictionary = new Dictionary(dictionary);
  }

  /** Romanize text. Thai is converted; other text is kept unless `keepNonThai: false`. */
  romanize(text: string, options?: RomanizeOptions): string {
    return this.analyze(text, options).output;
  }

  /** Romanize text and return every token, word and syllable with how it was read. */
  analyze(text: string, options?: RomanizeOptions): AnalyzeResult {
    if (typeof text !== 'string') throw new TypeError('text must be a string');
    const opts = resolveOptions(this.defaults, options);
    const stack = this.stack(opts);
    const normalized = normalizeThai(text);
    const warnings: Warning[] = [];
    const tokens: TokenResult[] = [];
    let lastWord = '';
    let capNext = opts.case === 'sentence';

    const cased = (roman: string): string => {
      if (!roman) return roman;
      if (opts.case !== 'sentence') return applyCase(roman, opts.case, opts.wordSeparator);
      const lower = roman.toLowerCase();
      if (!capNext) return lower;
      capNext = false;
      return capitalize(lower);
    };

    for (const raw of tokenize(normalized)) {
      let output = '';
      let words: WordResult[] | undefined;
      switch (raw.type) {
        case 'thai': {
          words = segmentThai(raw.text, opts.segmenter, stack).map((w) => {
            const word = this.word(w, stack, opts, warnings);
            return { ...word, roman: cased(word.roman) };
          });
          output = words.map((w) => w.roman).filter(Boolean).join(opts.wordSeparator);
          lastWord = words.length ? (words[words.length - 1] as WordResult).roman : lastWord;
          break;
        }
        case 'mai-yamok':
          output = opts.maiYamok === 'repeat' ? (opts.case === 'sentence' ? cased(lastWord) : lastWord) : opts.maiYamok === 'keep' ? raw.text : '';
          break;
        case 'paiyannoi':
          output = opts.paiyannoi === 'keep' ? raw.text : '';
          break;
        case 'etc':
          output = opts.paiyannoi === 'keep' ? raw.text : opts.keepNonThai ? 'etc.' : '';
          if (SENTENCE_END.test(output)) capNext = opts.case === 'sentence';
          break;
        case 'number':
          output = opts.keepNonThai ? (opts.thaiDigits === 'arabic' ? thaiDigitToArabic(raw.text) : raw.text) : '';
          if (output) capNext = false;
          break;
        case 'latin':
          output = opts.keepNonThai ? raw.text : '';
          if (output) capNext = false;
          break;
        case 'punct':
          output = opts.keepNonThai ? raw.text : '';
          if (opts.case === 'sentence' && SENTENCE_END.test(raw.text)) capNext = true;
          break;
        case 'space':
          output = raw.text;
          if (opts.case === 'sentence' && raw.text.includes('\n')) capNext = true;
          break;
      }
      tokens.push(words ? { ...raw, output, words } : { ...raw, output });
    }

    return { input: text, normalized, output: this.join(tokens, opts), tokens, warnings };
  }

  /** Syllables of one word read by rule (dictionary not consulted). */
  syllabify(word: string): SyllableResult[] {
    return parseWord(normalizeThai(word));
  }

  addWord(thai: string, roman: string): this {
    this.userDictionary.set(thai, roman);
    return this;
  }

  addWords(entries: Record<string, string> | Iterable<readonly [string, string]>): this {
    this.userDictionary.add(entries);
    return this;
  }

  /** Remove a user word, or hide a built-in one. Returns true if the word was known before. */
  removeWord(thai: string): boolean {
    const known = this.lookup(thai) !== undefined;
    this.userDictionary.delete(thai, true);
    return known;
  }

  /** The RTGS a dictionary (user, then built-in) gives for a word, if any. */
  lookup(thai: string, options?: RomanizeOptions): string | undefined {
    return this.stack(resolveOptions(this.defaults, options)).get(normalizeThai(thai))?.roman;
  }

  private stack(opts: ResolvedOptions): DictionaryStack {
    const layers: Dictionary[] = [];
    if (opts.dictionary && Object.keys(opts.dictionary).length) layers.push(new Dictionary(opts.dictionary));
    layers.push(this.userDictionary);
    if (opts.useBuiltinDictionary) layers.push(getBuiltinDictionary());
    return new DictionaryStack(layers);
  }

  private format(parts: string[][], opts: ResolvedOptions): string {
    return parts
      .map((syllables) => joinSyllables(syllables, opts.syllableSeparator, opts.hyphenateAmbiguous))
      .filter(Boolean)
      .join(opts.wordSeparator);
  }

  private word(thai: string, stack: DictionaryStack, opts: ResolvedOptions, warnings: Warning[]): WordResult {
    const entry = stack.get(thai);
    if (entry) {
      return { thai, roman: this.format(entry.words, opts), source: 'dictionary', confidence: 'dictionary', syllables: dictionarySyllables(entry) };
    }
    let rule = this.cache.get(thai);
    if (!rule) {
      const syllables = parseWord(thai);
      rule = {
        syllables,
        confidence: confidenceOf(syllables),
        unparsed: syllables.filter((s) => s.rules.includes('fallback')).map((s) => s.thai),
      };
      if (this.cache.size >= CACHE_LIMIT) this.cache.clear();
      this.cache.set(thai, rule);
    }
    for (const ch of rule.unparsed) {
      warnings.push({ code: 'unparsed', word: thai, message: `"${ch}" in "${thai}" does not fit a Thai syllable and was read on its own` });
    }
    return {
      thai,
      roman: this.format([rule.syllables.map((s) => s.roman)], opts),
      source: 'rules',
      confidence: rule.confidence,
      syllables: rule.syllables,
    };
  }

  /** Concatenate token outputs, putting the word separator between a romanized word and a word-like neighbour. */
  private join(tokens: TokenResult[], opts: ResolvedOptions): string {
    let out = '';
    let prevWordish = false;
    let prevThai = false;
    for (const t of tokens) {
      if (!t.output) continue;
      const thai = t.type === 'thai' || t.type === 'mai-yamok';
      const wordish = thai || t.type === 'latin' || t.type === 'number';
      if (wordish && prevWordish && (thai || prevThai)) out += opts.wordSeparator;
      out += t.output;
      prevWordish = wordish;
      prevThai = thai;
    }
    return opts.keepNonThai ? out : out.replace(/\s+/g, ' ').trim();
  }
}
