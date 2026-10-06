/**
 * Costs of the syllable parser, in tenths so sums stay exact integers.
 * The parser picks the segmentation with the lowest total. Written vowels are free; every inferred
 * sound costs something, so a reading backed by the spelling always beats a guessed one.
 */
export const COST = {
  /** Every syllable — among equal readings, fewer syllables win. */
  syllable: 1,
  falseCluster: 2,
  /** Clusters that occur only in loanwords: บร บล ดร ฟร ฟล (บริษัท is bo-ri-sat, not bri-sat). */
  loanCluster: 3,
  /** ทร read as s (ทราย sai, กระทรวง krasuang). */
  thorRorS: 3,
  /** ทร read as thr (นิทรา nithra). */
  thorRorThr: 4,
  /** ไ-ย with a silent ย (ไทย thai). */
  silentYo: 3,
  /** ว as the vowel ua (สวน suan, ขวด khuat). */
  woVowel: 5,
  /** Mai taikhu alone (ก็ ko). */
  maiTaikhuO: 5,
  /** Inferred o in a closed syllable (คน khon). */
  implicitO: 10,
  /** ร written after a final but not read (จักร chak, เพชร phet). Allowed only after a written vowel. */
  silentRor: 8,
  /** A final written with ิ/ุ that is not read (ปฏิวัติ -wat). Pricier than reading the vowel, unless the vowel before needs a final. */
  silentFinalVowel: 12,
  /** Inferred a in an open syllable (ถนน tha-non). */
  implicitA: 20,
  /** Extra for an inferred a after the first syllable — inside a word it is usually a Pali/Sanskrit linking vowel only a dictionary can predict. */
  implicitAMidWord: 5,
  /** Extra for an inferred a at the end of a word — Thai writes word-final a as ะ. */
  implicitAWordEnd: 30,
  /** Extra for an inferred a after a true cluster — such syllables are written with ะ (ประ, กระ). */
  implicitAAfterCluster: 10,
  /**
   * An inferred-vowel syllable that starts with a letter the previous open syllable could have taken as its final.
   * Thai spelling usually means the letter closes the previous syllable: โรง|พ|ยา|บาล, not โร|งพ|ยา|บาล.
   */
  implicitAfterOpen: 20,
  /**
   * A Pali/Sanskrit combining form read as a unit (ธน|กฤต tha-na-krit). Negative: a known stem is strong
   * evidence, and the rest of the word is a new morpheme that often starts with an inferred a (ภัทร|กมล).
   * Only stems that are safe to prefer are listed in combining-forms.ts.
   */
  combiningForm: -20,
  /**
   * Extra for a consonant read with an inferred a before a pre-vowel that belongs to the next consonant
   * (เสด็จ sa-det, เฉพาะ cha-pho). High enough that a plain two-syllable reading (โสภณ so-phon) still wins.
   */
  leadingConsonant: 15,
  /** Lower extra when the second consonant is a sonorant, the classic อักษรนำ pattern (เสนอ, โฉนด, แสวง, เอนก). */
  leadingConsonantSonorant: 8,
  /** A built-in dictionary word inside a longer word (เดือน|จรัส), on top of its syllables. Slightly preferred. */
  inWordDictionary: -3,
  /** ฤ / ฦ syllables. */
  ruLu: 2,
  /** One letter transcribed alone because nothing else parses. */
  fallback: 100,
} as const;
