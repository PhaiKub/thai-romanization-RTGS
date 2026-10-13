# Changelog

## 0.1.1 — 2026-10-13

- Held-out benchmark: the 878 official RTGS district names, split once into `dev` and `test` halves. `test` accuracy is 92.1% (91.9% before the fixes below); a regression test keeps it from dropping
- Compound place names read part by part: นคร, ปทุม, นิคม, สาคร, พนม, ชมพู, ชนะ, อารมณ์, รมย์ are matched inside longer words (ศรีนคร Si Nakhon, วาปีปทุม Wapi Pathum)
- Combining forms พุทธ (phut-tha) and กาญจน (kan-cha-na)
- A karan over two consonants after a final (ศาสตร์) no longer wins over reading the first consonant as a new syllable (มโนรมย์ manorom)
- npm keywords trimmed to thai, rtgs, romanization

## 0.1.0 — 2026-10-06

First release.

- `romanize`, `romanizeName`, `analyze`, `syllabify` and `createRomanizer` for Thai → RTGS (Royal Institute, 1999)
- Rule-based syllable parser: clusters, leading ห/อ, อักษรนำ, ร หัน, karan, silent ร and final vowels, inferred a/o vowels, ฤ/ฦ
- Pali/Sanskrit combining forms for names and compounds (ธนกฤต thanakrit, ภัทรกมล phattharakamon)
- Built-in dictionary: 77 provinces, 50 Bangkok districts, irregular words, common given names and name parts; user and per-call dictionaries
- Word segmentation with `Intl.Segmenter`, with dictionary-only and custom segmenter options
- Options for letter case, word and syllable separators, ambiguity hyphens, Thai digits, ๆ and ฯ
- ESM + CommonJS builds with TypeScript types; no runtime dependencies
