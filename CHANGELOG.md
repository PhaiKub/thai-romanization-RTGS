# Changelog

## 0.1.0 — 2026-10-06

First release.

- `romanize`, `romanizeName`, `analyze`, `syllabify` and `createRomanizer` for Thai → RTGS (Royal Institute, 1999)
- Rule-based syllable parser: clusters, leading ห/อ, อักษรนำ, ร หัน, karan, silent ร and final vowels, inferred a/o vowels, ฤ/ฦ
- Pali/Sanskrit combining forms for names and compounds (ธนกฤต thanakrit, ภัทรกมล phattharakamon)
- Built-in dictionary: 77 provinces, 50 Bangkok districts, irregular words, common given names and name parts; user and per-call dictionaries
- Word segmentation with `Intl.Segmenter`, with dictionary-only and custom segmenter options
- Options for letter case, word and syllable separators, ambiguity hyphens, Thai digits, ๆ and ฯ
- ESM + CommonJS builds with TypeScript types; no runtime dependencies
