/**
 * RTGS tables, following the Royal Institute's "หลักเกณฑ์การถอดอักษรไทยเป็นอักษรโรมันแบบถ่ายเสียง" (B.E. 2542 / 1999).
 * Tone, vowel length and mai taikhu are not written in RTGS.
 */

/** Initial consonant → RTGS. อ is a silent carrier for a vowel. */
export const INITIAL: Readonly<Record<string, string>> = {
  ก: 'k',
  ข: 'kh', ฃ: 'kh', ค: 'kh', ฅ: 'kh', ฆ: 'kh',
  ง: 'ng',
  จ: 'ch', ฉ: 'ch', ช: 'ch', ฌ: 'ch',
  ซ: 's', ศ: 's', ษ: 's', ส: 's',
  ญ: 'y', ย: 'y',
  ฎ: 'd', ด: 'd',
  ฏ: 't', ต: 't',
  ฐ: 'th', ฑ: 'th', ฒ: 'th', ถ: 'th', ท: 'th', ธ: 'th',
  ณ: 'n', น: 'n',
  บ: 'b',
  ป: 'p',
  ผ: 'ph', พ: 'ph', ภ: 'ph',
  ฝ: 'f', ฟ: 'f',
  ม: 'm',
  ร: 'r',
  ล: 'l', ฬ: 'l',
  ว: 'w',
  ห: 'h', ฮ: 'h',
  อ: '',
};

/** Final consonant → RTGS. ย and ว join the vowel instead (see {@link withFinalYo}, {@link withFinalWo}). */
export const FINAL: Readonly<Record<string, string>> = {
  ก: 'k', ข: 'k', ฃ: 'k', ค: 'k', ฅ: 'k', ฆ: 'k',
  ง: 'ng',
  จ: 't', ช: 't', ซ: 't', ฌ: 't', ฎ: 't', ฏ: 't', ฐ: 't', ฑ: 't', ฒ: 't',
  ด: 't', ต: 't', ถ: 't', ท: 't', ธ: 't', ศ: 't', ษ: 't', ส: 't',
  ญ: 'n', ณ: 'n', น: 'n', ร: 'n', ล: 'n', ฬ: 'n',
  บ: 'p', ป: 'p', พ: 'p', ฟ: 'p', ภ: 'p',
  ม: 'm',
  ย: 'i',
  ว: 'o',
};

/** True clusters (อักษรควบแท้): both consonants are pronounced. */
export const TRUE_CLUSTERS: ReadonlySet<string> = new Set([
  'กร', 'กล', 'กว',
  'ขร', 'ขล', 'ขว',
  'คร', 'คล', 'คว',
  'ตร',
  'ปร', 'ปล',
  'พร', 'พล', 'ผล',
  ...['บร', 'บล', 'ดร', 'ฟร', 'ฟล'],
]);

/** True clusters found only in loanwords (บรั่นดี, ดรัม, ฟรี); native บริ- is bo-ri. */
export const LOAN_CLUSTERS: ReadonlySet<string> = new Set(['บร', 'บล', 'ดร', 'ฟร', 'ฟล']);

/** False clusters (อักษรควบไม่แท้): ร is written but silent. ทร is handled separately (→ s). */
export const FALSE_CLUSTERS: ReadonlySet<string> = new Set(['จร', 'ซร', 'ศร', 'สร']);

/** Consonants that a leading ห (ห นำ) silences: หง หญ หน หม หย หร หล หว */
export const LEADING_H_TARGETS: ReadonlySet<string> = new Set(['ง', 'ญ', 'น', 'ม', 'ย', 'ร', 'ล', 'ว']);

/** Consonants that cannot close a syllable. */
export const NOT_FINAL: ReadonlySet<string> = new Set(['ฉ', 'ผ', 'ฝ', 'ห', 'อ', 'ฮ']);

/** RTGS for each vowel spelling, `-` standing for the initial consonant. Exposed for reference and docs. */
export const VOWELS: Readonly<Record<string, string>> = {
  '-ะ': 'a', '-ั': 'a', '-า': 'a', '-ำ': 'am', 'รร': 'a / an',
  '-ิ': 'i', '-ี': 'i',
  '-ึ': 'ue', '-ื': 'ue', '-ือ': 'ue',
  '-ุ': 'u', '-ู': 'u',
  'เ-ะ': 'e', 'เ-็': 'e', 'เ-': 'e',
  'แ-ะ': 'ae', 'แ-็': 'ae', 'แ-': 'ae',
  'โ-ะ': 'o', 'โ-': 'o', 'เ-าะ': 'o', '-อ': 'o', '-็อ': 'o', '(implicit, closed)': 'o',
  '(implicit, open)': 'a',
  'เ-อะ': 'oe', 'เ-อ': 'oe', 'เ-ิ': 'oe',
  'เ-ียะ': 'ia', 'เ-ีย': 'ia',
  'เ-ือะ': 'uea', 'เ-ือ': 'uea',
  '-ัวะ': 'ua', '-ัว': 'ua', '-ว-': 'ua',
  'ใ-': 'ai', 'ไ-': 'ai', 'ไ-ย': 'ai', '-ัย': 'ai', '-าย': 'ai',
  'เ-า': 'ao', '-าว': 'ao',
  '-ุย': 'ui', 'โ-ย': 'oi', '-อย': 'oi', 'เ-ย': 'oei', '-วย': 'uai', 'เ-ือย': 'ueai',
  '-ิว': 'io', 'เ-็ว': 'eo', 'เ-ว': 'eo', 'แ-็ว': 'aeo', 'แ-ว': 'aeo', 'เ-ียว': 'iao',
  'ฤ': 'rue / ri', 'ฤๅ': 'rue', 'ฦ': 'lue', 'ฦๅ': 'lue',
};

/** Vowel + final ย. RTGS writes the ย as `i`, except เ-ย which is the vowel เ-อ + ย. */
export function withFinalYo(vowel: string): string {
  if (vowel === 'e') return 'oei';
  return vowel.endsWith('i') ? vowel : `${vowel}i`;
}

/** Vowel + final ว, written as `o`. */
export function withFinalWo(vowel: string): string {
  return vowel.endsWith('o') ? vowel : `${vowel}o`;
}

/** ค-ฤ / พ-ฤ / ห-ฤ read `rue`; other consonants + ฤ read `ri` (กฤษ krit, ทฤษฎี thrit-). */
export const RU_AS_RUE_AFTER: ReadonlySet<string> = new Set(['ค', 'พ', 'ห']);

/** น-ฤ / ณ-ฤ / ม-ฤ take a vowel before the ฤ: นฤมล na-rue-mon, ณฤเบศ na-rue-bet. */
export const RU_AS_ARUE_AFTER: ReadonlySet<string> = new Set(['น', 'ณ', 'ม']);

export const RTGS_TABLES = {
  initial: INITIAL,
  final: FINAL,
  vowels: VOWELS,
  trueClusters: [...TRUE_CLUSTERS],
  falseClusters: [...FALSE_CLUSTERS],
  leadingH: [...LEADING_H_TARGETS].map((c) => `ห${c}`),
} as const;
