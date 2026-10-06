/** Output letter case. `title` capitalizes every romanized word, as RTGS does for proper names. */
export type CaseStyle = 'lower' | 'upper' | 'title' | 'sentence';

/** A function that splits a run of Thai letters into words. */
export type SegmenterFn = (thaiRun: string) => string[];

/**
 * - `intl`: `Intl.Segmenter('th')` (ICU dictionary), merged with the RTGS dictionary. Falls back to `dictionary` when unavailable.
 * - `dictionary`: longest match against the RTGS dictionary only; unknown stretches stay as one word.
 * - `none`: each Thai run is one word.
 */
export type SegmenterOption = 'intl' | 'dictionary' | 'none' | SegmenterFn;

export interface RomanizeOptions {
  /** Letter case of the output. Default `lower`. */
  case?: CaseStyle;
  /** Placed between Thai words. Default `' '`. */
  wordSeparator?: string;
  /** Placed between syllables of one word, e.g. `'-'` gives `tha-non`. Default `''`. */
  syllableSeparator?: string;
  /**
   * Insert `-` between syllables where joining them could be read another way, as RTGS recommends:
   * before a syllable that starts with a vowel (`sa-at`) or with `ng` after a vowel (`sa-nga`). Default `true`.
   */
  hyphenateAmbiguous?: boolean;
  /** Thai digits ๐–๙: convert to 0–9 (`arabic`) or keep. Default `arabic`. */
  thaiDigits?: 'arabic' | 'keep';
  /** Mai yamok (ๆ): repeat the previous word, keep the sign, or drop it. Default `repeat`. */
  maiYamok?: 'repeat' | 'keep' | 'drop';
  /** Paiyannoi (ฯ): drop it or keep it. `ฯลฯ` becomes `etc.` unless kept. Default `drop`. */
  paiyannoi?: 'drop' | 'keep';
  /** Keep Latin text, numbers and punctuation in the output. Default `true`. */
  keepNonThai?: boolean;
  /** Use the built-in dictionary (provinces, Bangkok districts, irregular words). Default `true`. */
  useBuiltinDictionary?: boolean;
  /** Extra dictionary entries for this call: Thai word → RTGS (`-` marks syllables, space marks words). */
  dictionary?: Record<string, string>;
  /** Word segmentation strategy. Default `intl`. */
  segmenter?: SegmenterOption;
}

export type ResolvedOptions = Required<Omit<RomanizeOptions, 'dictionary'>> & {
  dictionary: Record<string, string> | undefined;
};

/** How a syllable's sound was decided. */
export type SyllableRule =
  | 'true-cluster'
  | 'false-cluster'
  | 'thor-ror'
  | 'leading-h'
  | 'leading-o'
  | 'implicit-a'
  | 'implicit-o'
  | 'wo-vowel'
  | 'ror-han'
  | 'karan'
  | 'silent-ror'
  | 'silent-yo'
  | 'ru-lu'
  | 'fallback';

export interface SyllableResult {
  /** Thai spelling of the syllable. */
  thai: string;
  /** RTGS of the syllable. */
  roman: string;
  initial: { thai: string; roman: string };
  vowel: { thai: string; roman: string; implicit: boolean };
  final: { thai: string; roman: string };
  /** Letters that are written but not pronounced (karan, silent ร, …). */
  silent: string;
  rules: SyllableRule[];
}

export type WordSource = 'dictionary' | 'rules';

/**
 * - `dictionary`: taken from a dictionary entry
 * - `high`: every vowel is written
 * - `medium`: at least one vowel was inferred (implicit a/o) — usually right, worth a glance for names
 * - `low`: part of the word could not be parsed and was transcribed letter by letter
 */
export type Confidence = 'dictionary' | 'high' | 'medium' | 'low';

export interface WordResult {
  thai: string;
  roman: string;
  source: WordSource;
  confidence: Confidence;
  /** For dictionary words the syllables carry only `roman` (and `thai` when it is the whole word). */
  syllables: SyllableResult[];
}

export type TokenType = 'thai' | 'latin' | 'number' | 'space' | 'punct' | 'mai-yamok' | 'paiyannoi' | 'etc';

export interface TokenResult {
  type: TokenType;
  /** Original text of the token. */
  text: string;
  /** Offset in the normalized input. */
  start: number;
  end: number;
  /** Output text of the token after options are applied. */
  output: string;
  /** Present on `thai` tokens. */
  words?: WordResult[];
}

export type WarningCode = 'unparsed';

export interface Warning {
  code: WarningCode;
  word: string;
  message: string;
}

export interface AnalyzeResult {
  input: string;
  normalized: string;
  output: string;
  tokens: TokenResult[];
  warnings: Warning[];
}
