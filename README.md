# thai-rtgs — ถอดอักษรไทยเป็นอักษรโรมันแบบ RTGS

ระบบถอดอักษรไทยเป็นอักษรโรมันตาม **Royal Thai General System of Transcription (RTGS)** หรือหลักเกณฑ์การถอดอักษรไทยเป็นอักษรโรมันแบบถ่ายเสียงของราชบัณฑิตยสถาน (พ.ศ. 2542) เป็น library ภาษา TypeScript ไม่มี dependency ใช้ได้ทั้ง Node และเบราว์เซอร์ (ESM + CJS + type definitions)

```ts
import { romanize } from 'thai-rtgs';

romanize('กรุงเทพมหานคร', { case: 'title' });   // 'Krung Thep Maha Nakhon'
romanize('สวัสดีครับ ยินดีต้อนรับสู่ประเทศไทย'); // 'sawatdi khrap yindi tonrap su prathet thai'
romanize('ถนน', { syllableSeparator: '-' });      // 'tha-non'
```

## ทำงานอย่างไร

1. **Normalize** — แก้รูปแบบการพิมพ์ที่ต่างกัน (`ํา`→`ำ`, `เเ`→`แ`, วรรณยุกต์ที่พิมพ์ก่อนสระ, อักขระที่มองไม่เห็น)
2. **Tokenize** — แยกข้อความไทย อังกฤษ ตัวเลข เครื่องหมาย `ๆ` `ฯ` และ `ฯลฯ`
3. **ตัดคำ** — ใช้ `Intl.Segmenter('th')` แล้วรวม segment ที่ต่อกันเป็นคำในพจนานุกรม (เช่น กรุงเทพมหานคร)
4. **พจนานุกรม** — มีชื่อ 77 จังหวัด, 50 เขตของกรุงเทพฯ และคำที่อ่านไม่ตรงกฎ (ราชการ, ผลไม้, ประวัติศาสตร์, ก็, …) ผู้ใช้เพิ่มหรือแก้คำเองได้
5. **แยกพยางค์ตามกฎ** — สำหรับคำที่ไม่มีในพจนานุกรม หาวิธีแบ่งพยางค์ที่ "ต้นทุนต่ำสุด" (dynamic programming) จาก template ของสระ พยัญชนะต้น ควบกล้ำ ห นำ ตัวสะกด การันต์ และ ร หัน สระที่ไม่ได้เขียนรูป (ถนน → tha-non) มีต้นทุน จึงถูกเลือกเฉพาะเมื่อตัวสะกดบังคับให้ต้องมี
6. **จัดรูปแบบ** — ต่อพยางค์และคำ ใส่ยัติภังค์ (`-`) เมื่ออ่านกำกวม (สะอาด → sa-at) และจัดตัวพิมพ์เล็ก/ใหญ่

รายละเอียดกฎทั้งหมดอยู่ใน [docs/rtgs-rules.md](docs/rtgs-rules.md)

## ความแม่นยำ

`npm run eval` วัดผลกับชุดทดสอบใน [test/fixtures/golden.ts](test/fixtures/golden.ts):

| ชุดทดสอบ | ผล |
|---|---|
| คำทั่วไป อ่านด้วยกฎล้วน (ปิดพจนานุกรม) | 225/225 |
| คำศัพท์ประจำวันที่ไม่ได้ใช้ระหว่างปรับกฎ (เปิดพจนานุกรม) | 190/190 |
| คำที่ต้องใช้พจนานุกรม | 25/25 |
| จังหวัด (Title case) | 28/28 |
| ประโยค | 8/8 |

ก่อนเพิ่มคำบาลี-สันสกฤต 4 คำเข้าพจนานุกรม ชุดคำศัพท์ประจำวันได้ 184/190 (96.8%) คำที่ผิดเป็นคำที่มีพยางค์เชื่อมทั้งหมด (เอกสาร ek-ka-san, ธุรกิจ thu-ra-kit) ซึ่งเป็นสิ่งที่กฎอย่างเดียวคาดไม่ได้

## Library

```bash
npm install thai-rtgs
```

```ts
import { romanize, analyze, syllabify, createRomanizer } from 'thai-rtgs';

// ตัวเลือก
romanize('สะอาด');                                   // 'sa-at'
romanize('สะอาด', { hyphenateAmbiguous: false });    // 'saat'
romanize('เด็กๆ เล่นกัน', { case: 'sentence' });     // 'Dek dek len kan'
romanize('วันที่ ๑๒ มกราคม ๒๕๖๗');                    // 'wan thi 12 mokkarakhom 2567'
romanize('ฉันชอบ iPhone 15', { keepNonThai: false }); // 'chan chop'

// คำเฉพาะสำหรับการเรียกครั้งเดียว (- คั่นพยางค์ เว้นวรรคคั่นคำ)
romanize('สมชาย ใจดี', { case: 'title', dictionary: { สมชาย: 'som-chai', ใจดี: 'chai-di' } }); // 'Somchai Chaidi'

// instance ที่มีพจนานุกรมและค่าตั้งต้นของตัวเอง
const rtgs = createRomanizer({ case: 'title' });
rtgs.addWord('ภัทรา', 'phat-tha-ra');
rtgs.romanize('ภัทรา');   // 'Phatthara'
rtgs.removeWord('ราชบุรี'); // ซ่อนคำในพจนานุกรมในตัว (เฉพาะ instance นี้)

// รายละเอียดทีละคำ/พยางค์
analyze('ถนนราชบุรี').tokens[0].words;
// [{ thai: 'ถนน', roman: 'thanon', source: 'rules', confidence: 'medium', syllables: [...] },
//  { thai: 'ราชบุรี', roman: 'ratchaburi', source: 'dictionary', confidence: 'dictionary', ... }]

syllabify('เปลี่ยน');
// [{ thai: 'เปลี่ยน', roman: 'plian', initial: { thai: 'ปล', roman: 'pl' },
//    vowel: { thai: 'เ-ีย', roman: 'ia', implicit: false }, final: { thai: 'น', roman: 'n' },
//    silent: '', rules: ['true-cluster'] }]
```

### ตัวเลือก (`RomanizeOptions`)

| ตัวเลือก | ค่า | ค่าเริ่มต้น | ความหมาย |
|---|---|---|---|
| `case` | `lower` `upper` `title` `sentence` | `lower` | ตัวพิมพ์ `title` ขึ้นต้นตัวใหญ่ทุกคำ เหมาะกับชื่อเฉพาะ |
| `wordSeparator` | string | `' '` | ตัวคั่นระหว่างคำไทย |
| `syllableSeparator` | string | `''` | ตัวคั่นพยางค์ เช่น `'-'` |
| `hyphenateAmbiguous` | boolean | `true` | ใส่ `-` เมื่อพยางค์ต่อกันแล้วอ่านกำกวม (sa-at, sa-nga) |
| `thaiDigits` | `arabic` `keep` | `arabic` | เลขไทย ๐-๙ |
| `maiYamok` | `repeat` `keep` `drop` | `repeat` | ไม้ยมก `ๆ` |
| `paiyannoi` | `drop` `keep` | `drop` | ไปยาลน้อย `ฯ` (`ฯลฯ` → `etc.`) |
| `keepNonThai` | boolean | `true` | เก็บข้อความภาษาอื่น ตัวเลข และเครื่องหมาย |
| `useBuiltinDictionary` | boolean | `true` | ใช้พจนานุกรมในตัว |
| `dictionary` | `Record<string, string>` | — | คำเพิ่มเติมสำหรับการเรียกครั้งนั้น |
| `segmenter` | `intl` `dictionary` `none` หรือ function | `intl` | วิธีตัดคำ (ถ้าไม่มี `Intl.Segmenter` จะใช้ `dictionary`) |

ค่า `confidence` ของแต่ละคำ: `dictionary` (จากพจนานุกรม), `high` (สระเขียนรูปครบ), `medium` (มีสระที่ไม่เขียนรูป ควรตรวจถ้าเป็นชื่อเฉพาะ), `low` (มีอักษรที่แยกพยางค์ไม่ได้ และมี warning `unparsed`)

## พัฒนา

```bash
npm install
npm test            # vitest
npm run typecheck
npm run eval        # รายงานความแม่นยำ
npm run build       # dist/ (ESM + CJS + .d.ts)
```

รองรับ Node.js 18 ขึ้นไป (การพัฒนาใช้ Node 20 ขึ้นไป)

## ข้อจำกัด

- RTGS ไม่มีวรรณยุกต์และความยาวสระ จึงแปลงกลับเป็นอักษรไทยไม่ได้
- คำบาลี-สันสกฤตที่มีพยางค์เชื่อม (ราชบุรี rat-cha-bu-ri, ผลไม้ phon-la-mai) ชื่อคน และคำทับศัพท์ ต้องพึ่งพจนานุกรม คำที่กฎอ่านผิดให้เพิ่มผ่าน `dictionary` หรือ `addWord`
- ผลการตัดคำของ `Intl.Segmenter` ขึ้นกับเวอร์ชัน ICU ของ runtime อาจต่างกันเล็กน้อย คำประสมที่ ICU ไม่แยก (เช่น รถไฟฟ้า) จะออกมาติดกัน (`rotfaifa`)
- ชื่อจังหวัดและเขตเขียนตามแบบราชบัณฑิตยสถาน (เช่น Chon Buri, Buri Ram) ซึ่งอาจต่างจากตัวสะกดที่ใช้กันทั่วไป (Chonburi, Buriram) แก้ได้ผ่าน `dictionary`

---

## English quickstart

`thai-rtgs` converts Thai script to Latin letters with the Royal Thai General System of Transcription. Words not in its dictionary go through a rule-based syllable parser, which finds the lowest-cost segmentation of Thai orthographic syllables. A dictionary covers the provinces, the Bangkok districts and words with irregular or Pali/Sanskrit readings. It has no dependencies and runs in Node and browsers.

```ts
import { romanize } from 'thai-rtgs';
romanize('เชียงใหม่', { case: 'title' }); // 'Chiang Mai'
```
