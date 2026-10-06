/**
 * Pali/Sanskrit stems that change their reading inside a compound, mostly in names.
 * ธน alone is "thon", but ธน + กฤต is "tha-na-krit"; ราช alone is "rat", but ราช + การ is "rat-cha-kan".
 *
 * - `PREFIX_FORMS` apply only when more letters follow in the same word.
 * - `SUFFIX_FORMS` apply only at the end of a word, after other letters.
 * - `STEM_FORMS` (stems ending in า) apply before more letters or at the end of the word.
 *
 * The syllable parser treats each as one more candidate reading, so the rules still win when they
 * fit the spelling better.
 */
export const PREFIX_FORMS: Readonly<Record<string, string>> = {
  // name stems
  ภัทร: 'phat-tha-ra',
  ศุภ: 'sup-pha',
  ธน: 'tha-na',
  ธีร: 'thi-ra',
  จิร: 'chi-ra',
  ศีล: 'sin-la',
  พชร: 'phat-cha-ra',
  พัชร: 'phat-cha-ra',
  ณัฐ: 'nat-tha',
  ณัษฐ: 'nat-tha',
  กฤษณ: 'krit-sa-na',
  กฤต: 'krit-ta',
  ทัศน: 'that-sa-na',
  บุษย: 'but-sa-ya',
  รัตน: 'rat-ta-na',
  วัฒน: 'wat-tha-na',
  อุบล: 'u-bon',
  พิมล: 'phi-mon',
  นิร: 'ni-ra',
  วิศ: 'wit-sa',
  พงศ: 'phong-sa',
  อริย: 'a-ri-ya',
  กันต: 'kan-ta',
  นนท: 'non-tha',
  พีร: 'phi-ra',
  วัชร: 'wat-cha-ra',
  วิมล: 'wi-mon',
  อัศว: 'at-sa-wa',
  ยุทธ: 'yut-tha',
  วร: 'wo-ra',
  จีร: 'chi-ra',
  พิร: 'phi-ra',
  ภิร: 'phi-ra',
  พัฒน: 'phat-tha-na',
  วุฒิ: 'wut-thi',
  อรรถ: 'at-tha',
  ภิรมย: 'phi-rom-ya',
  // compound stems in ordinary vocabulary
  ราช: 'rat-cha',
  เอก: 'ek-ka',
  ธรรม: 'tham-ma',
  กรรม: 'kam-ma',
  รัฐ: 'rat-tha',
  เศรษฐ: 'set-tha',
  ประวัติ: 'pra-wat-ti',
  อุบัติ: 'u-bat-ti',
  ศิลป: 'sin-la-pa',
};

export const SUFFIX_FORMS: Readonly<Record<string, string>> = {
  กร: 'kon',
  กรณ์: 'kon',
  ธร: 'thon',
  ภรณ์: 'phon',
  พร: 'phon',
  วดี: 'wa-di',
};

/** Stems ending in า, read the same alone or in a compound (ภัทรา|วุธ phat-tha-ra-wut, รัตนา rat-ta-na). */
export const STEM_FORMS: Readonly<Record<string, string>> = {
  ภัทรา: 'phat-tha-ra',
  พัชรา: 'phat-cha-ra',
  รัตนา: 'rat-ta-na',
  กฤษณา: 'krit-sa-na',
  ทัศนา: 'that-sa-na',
  วัฒนา: 'wat-tha-na',
  ธนา: 'tha-na',
};
