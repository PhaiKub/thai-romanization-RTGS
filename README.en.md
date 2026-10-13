# thai-rtgs

[ภาษาไทย](README.md) · **English**

Romanize Thai script with the **Royal Thai General System of Transcription (RTGS)**, the official system of the Royal Institute of Thailand (1999). A TypeScript library with no dependencies that runs in Node.js and browsers (ESM + CommonJS + type definitions).

```ts
import { romanize } from 'thai-rtgs';

romanize('กรุงเทพมหานคร', { case: 'title' });   // 'Krung Thep Maha Nakhon'
romanize('สวัสดีครับ ยินดีต้อนรับสู่ประเทศไทย'); // 'sawatdi khrap yindi tonrap su prathet thai'
romanize('ถนน', { syllableSeparator: '-' });      // 'tha-non'
```

```bash
npm install thai-rtgs
```

## Why it is not a lookup table

Thai is written without spaces between words, and many vowels are not written at all: ถนน is read *tha-non*, with an *a* and an *o* that appear nowhere in the spelling. Words borrowed from Pali and Sanskrit add linking syllables that the spelling does not show either: ราชบุรี is *rat-cha-bu-ri*, not *rat-bu-ri*. `thai-rtgs` handles this in layers:

1. **Normalize** common typing variants (`ํา` → `ำ`, `เเ` → `แ`, tone marks typed before vowels, invisible characters).
2. **Tokenize** into Thai, Latin, numbers and punctuation, with `ๆ`, `ฯ` and `ฯลฯ` handled separately.
3. **Segment words** with `Intl.Segmenter('th')`. Segments are rejoined when they form a dictionary word (กรุงเทพมหานคร), or when the segmenter cut an unknown word into fragments. After a title such as นาย or นางสาว, a person's name is read as whole words.
4. **Dictionary**: the 77 provinces, the 50 Bangkok districts, irregular words (ก็, ราชการ, ผลไม้, ประวัติศาสตร์, …), common given names and the parts Thai surnames are built from. Dictionary words are also recognised inside longer words (มี|สวัสดิ์ → *misawat*). You can add or override entries.
5. **Syllable parser** for everything else. It enumerates every way the letters can form Thai syllables (initial consonants and clusters, written and unwritten vowels, finals, silent letters marked with ์, ร หัน, leading ห/อ, ฤ/ฦ). It then picks the reading with the lowest cost: written vowels are free, and every inferred sound costs something. It also knows **combining forms**, Pali/Sanskrit stems that take a linking syllable before another part (ธน|กฤต → *thanakrit*, ภัทร|กมล → *phattharakamon*).
6. **Format** syllables and words, with a hyphen where RTGS needs one to avoid ambiguity (สะอาด → *sa-at*), and the letter case you ask for.

The rules are documented (in Thai) in [docs/rtgs-rules.md](docs/rtgs-rules.md).

## Accuracy

### Held-out benchmark

The benchmark is the **878 Thai districts (amphoe)** with their official RTGS names, from [Wikipedia](https://en.wikipedia.org/wiki/List_of_districts_of_Thailand). Six royal names whose official spelling is not RTGS (such as *Sirindhorn*) are excluded. The list is split once, by a hash of each name, into two halves:

| Half | Used for | Accuracy |
|---|---|---|
| test | never inspected, never used to tune the rules | **399/433 (92.1%)** |
| dev | finding error patterns to fix | 419/439 (95.4%) |

- **How it is scored:** letters only; spaces, hyphens and letter case are ignored.
- **Before any tuning on dev:** the test half scored 91.9%.
- **What still fails:** mostly Pali/Sanskrit compounds with a linking syllable that the spelling does not show (รัตภูมิ *Rattaphum*, องครักษ์ *Ongkharak*).
- **Rebuilding the data:** `node scripts/build-district-benchmark.mjs`.
- **Regression guard:** a test fails if either half drops below its current accuracy.

### Development fixtures

`npm run eval` also scores the fixtures in [test/fixtures/golden.ts](test/fixtures/golden.ts): everyday words, rule-only words, given names, provinces and sentences. They all score 100%, but the rules were tuned on them, so they guard against regressions rather than measure accuracy. Before tuning, the everyday words scored 96.8% and the given names 85%.

Names are the hardest case. On a sample of real Thai first names and surnames that had not been used for tuning, about 80% of first names and 93% of surnames were right. The rules and the name dictionary have been improved since. Check words with `confidence: 'medium'`, and add the ones you need through `dictionary`.

## Usage

```ts
import { romanize, romanizeName, analyze, syllabify, createRomanizer } from 'thai-rtgs';

// Options
romanize('สะอาด');                                   // 'sa-at'
romanize('สะอาด', { hyphenateAmbiguous: false });    // 'saat'
romanize('เด็กๆ เล่นกัน', { case: 'sentence' });     // 'Dek dek len kan'
romanize('วันที่ ๑๒ มกราคม ๒๕๖๗');                    // 'wan thi 12 mokkarakhom 2567'
romanize('ฉันชอบ iPhone 15', { keepNonThai: false }); // 'chan chop'

// Personal names: each space-separated part is one word, a leading title is split off, title case
romanizeName('นางสาวภัทรกมล สุขสวัสดิ์'); // 'Nangsao Phattharakamon Suksawat'

// A name after a title in running text (นาย, นาง, นางสาว, เด็กชาย, เด็กหญิง, ดร., น.ส., …)
romanize('นางสาววิชุดา ใจดี เป็นนักเรียน', { case: 'sentence' }); // 'Nangsao Wichuda Chaidi pen nakrian'

// Extra words for one call ("-" separates syllables, a space separates words)
romanize('สมชาย ใจดี', { case: 'title', dictionary: { สมชาย: 'som-chai', ใจดี: 'chai-di' } }); // 'Somchai Chaidi'

// An instance with its own defaults and dictionary
const rtgs = createRomanizer({ case: 'title' });
rtgs.addWord('ภัทรา', 'phat-tha-ra');
rtgs.romanize('ภัทรา');      // 'Phatthara'
rtgs.removeWord('ราชบุรี'); // hides a built-in entry, for this instance only

// Word-by-word and syllable-by-syllable detail
analyze('ถนนราชบุรี').tokens[0].words;
// [{ thai: 'ถนน', roman: 'thanon', source: 'rules', confidence: 'medium', syllables: [...] },
//  { thai: 'ราชบุรี', roman: 'ratchaburi', source: 'dictionary', confidence: 'dictionary', ... }]

syllabify('เปลี่ยน');
// [{ thai: 'เปลี่ยน', roman: 'plian', initial: { thai: 'ปล', roman: 'pl' },
//    vowel: { thai: 'เ-ีย', roman: 'ia', implicit: false }, final: { thai: 'น', roman: 'n' },
//    silent: '', rules: ['true-cluster'] }]
```

### API

| Function | Returns |
|---|---|
| `romanize(text, options?)` | RTGS string; non-Thai text is kept unless `keepNonThai: false` |
| `romanizeName(name, options?)` | A personal name, each part read as one word, title case by default |
| `analyze(text, options?)` | Every token, word and syllable, with how each was read, plus `warnings` |
| `syllabify(word)` | The syllables of one word, read by rule only |
| `createRomanizer(options?)` | A `Romanizer` with its own defaults and dictionary: `.romanize`, `.romanizeName`, `.analyze`, `.addWord`, `.addWords`, `.removeWord`, `.lookup` |
| `normalizeThai(text)`, `isThai(text)` | Helpers |
| `RTGS_TABLES`, `getBuiltinDictionary()`, `Dictionary` | The consonant/vowel tables and the dictionaries, for reference or extension |

### Options (`RomanizeOptions`)

| Option | Values | Default | Effect |
|---|---|---|---|
| `case` | `lower` `upper` `title` `sentence` | `lower` | `title` capitalizes every word, as RTGS does for proper names |
| `wordSeparator` | string | `' '` | Between Thai words |
| `syllableSeparator` | string | `''` | Between syllables, e.g. `'-'` |
| `hyphenateAmbiguous` | boolean | `true` | Hyphen where syllables would read ambiguously (*sa-at*, *sa-nga*) |
| `thaiDigits` | `arabic` `keep` | `arabic` | Thai digits ๐–๙ |
| `maiYamok` | `repeat` `keep` `drop` | `repeat` | The repetition sign `ๆ` |
| `paiyannoi` | `drop` `keep` | `drop` | The abbreviation sign `ฯ` (`ฯลฯ` becomes `etc.`) |
| `keepNonThai` | boolean | `true` | Keep Latin text, numbers and punctuation |
| `useBuiltinDictionary` | boolean | `true` | Use the built-in dictionary |
| `dictionary` | `Record<string, string>` | — | Extra entries for this call |
| `segmenter` | `intl` `dictionary` `none` or a function | `intl` | Word segmentation (falls back to `dictionary` without `Intl.Segmenter`) |
| `detectNames` | boolean | `true` | Read a name after a title as whole words: the given name joined to the title and the surname after one space. Names are capitalized in `sentence` case |

Each word in `analyze()` has a `confidence`:

- `dictionary`: from a dictionary entry
- `high`: every vowel is written
- `medium`: a vowel was inferred; usually right, but worth a look for names
- `low`: part of the word did not fit any syllable, and an `unparsed` warning is added

## Limitations

- **One-way only:** RTGS does not record tones or vowel length, so it cannot be converted back to Thai.
- **Linking syllables, names and loanwords:** Pali/Sanskrit linking syllables (ราชบุรี *rat-cha-bu-ri*, ผลไม้ *phon-la-mai*), personal names and loanwords depend on the dictionary. Add what the rules miss with `dictionary` or `addWord`.
- **Names without a title:** a name in running text is recognised only after a title. Without one, `Intl.Segmenter`, which does not know names, may split it into several words: the letters are right, but with spaces in between. When you know the text is a name, use `romanizeName()`.
- **Abbreviated titles:** ดร. and น.ส. are transcribed letter by letter (*don.*, *na.sa.*), since RTGS has no standard abbreviations.
- **Segmentation varies by runtime:** `Intl.Segmenter` depends on the runtime's ICU version, so results can differ slightly. Compounds that ICU keeps whole (รถไฟฟ้า) come out as one word (*rotfaifa*).
- **Official spellings of place names:** provinces and districts follow the Royal Institute's spelling (*Chon Buri*, *Buri Ram*), which can differ from common usage (*Chonburi*, *Buriram*). Override them with `dictionary` if needed.

## Development

```bash
npm install
npm test            # vitest
npm run typecheck
npm run eval        # accuracy report; add -- --dev to list dev-half misses
npm run build       # dist/ (ESM + CommonJS + .d.ts)
```

The package supports Node.js 18 and later; development needs Node.js 22 or later.

### Releasing

[`.github/workflows/release.yml`](.github/workflows/release.yml) uploads the package to npm with **trusted publishing**, so no npm token is stored anywhere. The trusted publisher may only **stage** a version: it becomes public after a maintainer approves it with 2FA.

1. Bump `version` in `package.json` and `VERSION` in `src/index.ts`.
2. Add a `## x.y.z — date` section to `CHANGELOG.md`.
3. Commit, then push a matching tag:

```bash
git tag -a v0.1.2 -m "thai-rtgs 0.1.2"
```

```bash
git push origin v0.1.2
```

4. The workflow checks that the tag matches the version and that the CHANGELOG has a section for it. It then runs typecheck, tests and build, runs `npm stage publish`, and drafts a GitHub Release from the CHANGELOG.
5. Approve on your machine (logged in to npm, with 2FA):

```bash
npm stage list thai-rtgs
```

```bash
npm stage approve <stage-id>
```

6. Publish the draft GitHub Release.

Running the workflow by hand ("Run workflow" on the Actions page) is always a dry run; only a pushed tag uploads to npm.

## License

[MIT](LICENSE)
