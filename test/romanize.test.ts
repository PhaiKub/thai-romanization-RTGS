import { describe, expect, it } from 'vitest';
import { analyze, createRomanizer, Dictionary, normalizeThai, romanize, syllabify } from '../src/index';
import { tokenize } from '../src/text/tokenize';
import { DICTIONARY_WORDS, EVERYDAY_WORDS, GIVEN_NAME_WORDS, PROVINCE_TITLES, RULE_WORDS, SENTENCES } from './fixtures/golden';
import { PROVINCES } from '../src/dictionary/data/provinces';
import { BANGKOK_DISTRICTS } from '../src/dictionary/data/bangkok-districts';

const strip = (s: string) => s.replace(/\s+/g, '');

describe('golden fixtures', () => {
  it.each(Object.entries(RULE_WORDS))('rules: %s → %s', (thai, expected) => {
    expect(strip(romanize(thai, { useBuiltinDictionary: false, segmenter: 'none' }))).toBe(expected);
  });
  it.each(Object.entries(EVERYDAY_WORDS))('everyday: %s → %s', (thai, expected) => {
    expect(strip(romanize(thai, { segmenter: 'none' }))).toBe(strip(expected));
  });
  it.each(Object.entries(GIVEN_NAME_WORDS))('given name: %s → %s', (thai, expected) => {
    expect(strip(romanize(thai, { segmenter: 'none' }))).toBe(expected);
  });
  it.each(Object.entries(DICTIONARY_WORDS))('dictionary: %s → %s', (thai, expected) => {
    expect(strip(romanize(thai, { segmenter: 'none' }))).toBe(expected);
  });
  it.each(Object.entries(PROVINCE_TITLES))('province: %s → %s', (thai, expected) => {
    expect(romanize(thai, { case: 'title' })).toBe(expected);
  });
  it.each(Object.entries(SENTENCES))('sentence: %s', (thai, expected) => {
    expect(romanize(thai)).toBe(expected);
  });
});

describe('built-in data', () => {
  it('has all 77 provinces and 50 Bangkok districts', () => {
    expect(Object.keys(PROVINCES)).toHaveLength(77);
    expect(Object.keys(BANGKOK_DISTRICTS)).toHaveLength(50);
  });
});

describe('normalizeThai', () => {
  it('fixes common typing variants', () => {
    expect(normalizeThai('น้ํา')).toBe('น้ำ'); // nikhahit + sara aa
    expect(normalizeThai('เเมว')).toBe('แมว');
    expect(normalizeThai('ท่ี')).toBe('ที่'); // tone typed before the vowel
    expect(normalizeThai('ก​า')).toBe('กา');
  });
});

describe('tokenize', () => {
  it('splits mixed text and keeps ๆ ฯ ฯลฯ apart', () => {
    const types = tokenize('เด็กๆ 1,000.5 ok ฯลฯ กรุงเทพฯ!').map((t) => t.type);
    expect(types).toEqual(['thai', 'mai-yamok', 'space', 'number', 'space', 'latin', 'space', 'etc', 'space', 'thai', 'paiyannoi', 'punct']);
  });
});

describe('options', () => {
  it('case styles', () => {
    expect(romanize('เชียงใหม่', { case: 'upper' })).toBe('CHIANG MAI');
    expect(romanize('สวัสดีครับ. ขอบคุณ', { case: 'sentence' })).toBe('Sawatdi khrap. Khop khun');
  });
  it('syllable separator', () => {
    expect(romanize('ถนน', { syllableSeparator: '-' })).toBe('tha-non');
    expect(romanize('ราชบุรี', { syllableSeparator: '·' })).toBe('rat·cha·bu·ri');
  });
  it('word separator', () => {
    expect(romanize('กรุงเทพมหานคร', { wordSeparator: '_' })).toBe('krung_thep_maha_nakhon');
  });
  it('ambiguity hyphen can be turned off', () => {
    expect(romanize('สะอาด')).toBe('sa-at');
    expect(romanize('สะอาด', { hyphenateAmbiguous: false })).toBe('saat');
  });
  it('mai yamok, paiyannoi and digits', () => {
    expect(romanize('เด็กๆ', { maiYamok: 'drop' })).toBe('dek');
    expect(romanize('เด็กๆ', { maiYamok: 'keep' })).toBe('dek ๆ');
    expect(romanize('กรุงเทพฯ', { paiyannoi: 'keep' })).toBe('krung thepฯ');
    expect(romanize('๒๕๖๗', { thaiDigits: 'keep' })).toBe('๒๕๖๗');
  });
  it('keepNonThai: false drops everything that is not Thai', () => {
    expect(romanize('ฉันชอบ iPhone 15 มาก!', { keepNonThai: false })).toBe('chan chop mak');
  });
  it('segmenter modes', () => {
    expect(romanize('สวัสดีครับ', { segmenter: 'none' })).toBe('sawatdikhrap');
    expect(romanize('ไปเชียงใหม่', { segmenter: 'dictionary' })).toBe('pai chiang mai');
    expect(romanize('ไปเชียงใหม่', { segmenter: (s) => [s.slice(0, 2), s.slice(2)] })).toBe('pai chiang mai');
  });
  it('rejects invalid option values', () => {
    expect(() => romanize('ก', { case: 'camel' as never })).toThrow(/Invalid option case/);
  });
});

describe('dictionary', () => {
  it('per-call entries override the rules and the built-in dictionary', () => {
    expect(romanize('สมชาย ใจดี', { dictionary: { สมชาย: 'som-chai', ใจดี: 'chai-di' }, case: 'title' })).toBe('Somchai Chaidi');
    expect(romanize('ราชบุรี', { dictionary: { ราชบุรี: 'rat-bu-ri' } })).toBe('ratburi');
  });
  it('Romanizer instances keep their own words and can hide built-in ones', () => {
    const r = createRomanizer({ case: 'title' });
    r.addWord('ภัทรา', 'phat-tha-ra');
    expect(r.romanize('ภัทรา')).toBe('Phatthara');
    expect(r.lookup('ราชบุรี')).toBe('rat-cha-bu-ri');
    expect(r.removeWord('ราชบุรี')).toBe(true);
    expect(r.lookup('ราชบุรี')).toBeUndefined();
    expect(romanize('ราชบุรี')).toBe('ratchaburi'); // the shared instance is untouched
  });
  it('useBuiltinDictionary: false uses rules only', () => {
    expect(romanize('ชาติ', { useBuiltinDictionary: false })).toBe('chati');
    expect(romanize('ชาติ')).toBe('chat');
  });
  it('Dictionary parses syllables and words', () => {
    const d = new Dictionary({ กรุงเทพ: 'Krung Thep' });
    expect(d.get('กรุงเทพ')?.words).toEqual([['krung'], ['thep']]);
    expect(() => d.set('', 'x')).toThrow();
  });
});

describe('analyze', () => {
  it('reports words, syllables, sources and confidence', () => {
    const r = analyze('ถนนราชบุรี');
    const words = r.tokens[0]?.words ?? [];
    expect(words.map((w) => [w.thai, w.source, w.confidence])).toEqual([
      ['ถนน', 'rules', 'medium'],
      ['ราชบุรี', 'dictionary', 'dictionary'],
    ]);
    expect(words[0]?.syllables.map((s) => s.roman)).toEqual(['tha', 'non']);
    expect(words[0]?.syllables[0]?.rules).toContain('implicit-a');
    expect(r.output).toBe('thanon ratchaburi');
  });
  it('never throws on malformed input and warns instead', () => {
    const r = analyze('ิ่กา');
    expect(r.output).toBe('i ka');
    expect(r.warnings.map((w) => w.code)).toContain('unparsed');
  });
  it('handles empty and non-Thai input', () => {
    expect(romanize('')).toBe('');
    expect(romanize('Hello, world!')).toBe('Hello, world!');
  });
});

describe('compound and name readings', () => {
  const read = (w: string) => romanize(w, { segmenter: 'none' });
  it('combining forms read a stem with its linking syllable only before more letters', () => {
    expect(read('ธนกฤต')).toBe('thanakrit');
    expect(read('ภัทรกมล')).toBe('phattharakamon');
    expect(read('ราชวัตร')).toBe('ratchawat');
    expect(read('วุฒิชัย')).toBe('wutthichai');
    expect(read('วุฒิ')).toBe('wut');
    expect(read('ราชา')).toBe('racha');
    expect(read('วรรณ')).toBe('wan');
  });
  it('suffix and stem forms', () => {
    expect(read('นรากร')).toBe('narakon');
    expect(read('สุภาวดี')).toBe('suphawadi');
    expect(read('รัตนา')).toBe('rattana');
  });
  it('อักษรนำ written behind a pre-vowel', () => {
    expect(read('เจริญ')).toBe('charoen');
    expect(read('เสนอ')).toBe('sanoe');
    expect(read('เสด็จ')).toBe('sadet');
    expect(read('โฉนด')).toBe('chanot');
    expect(read('โสภณ')).toBe('sophon');
    expect(read('เนติมา')).toBe('netima');
    expect(read('เสริม')).toBe('soem');
  });
  it('false clusters split before ิ ุ ู, except จริง', () => {
    expect(read('สรุป')).toBe('sarup');
    expect(read('จริยา')).toBe('chariya');
    expect(read('จริง')).toBe('ching');
  });
  it('silent final ิ ุ after a written vowel, ฤา, and น/ณ/ม + ฤ', () => {
    expect(read('ปฏิวัติ')).toBe('patiwat');
    expect(read('ฤาษี')).toBe('ruesi');
    expect(read('นฤมล')).toBe('naruemon');
    expect(read('อังกฤษ')).toBe('angkrit');
    expect(read('เสนีย์')).toBe('seni');
  });
  it('dictionary words are read inside longer words', () => {
    expect(read('มีสวัสดิ์')).toBe('misawat');
    expect(read('จินดามณีพล')).toBe('chindamaniphon');
    expect(romanize('มีสวัสดิ์', { segmenter: 'none', useBuiltinDictionary: false })).toBe('mitwat');
  });
});

describe('syllabify', () => {
  it('breaks a word into initial / vowel / final', () => {
    const [s] = syllabify('เปลี่ยน');
    expect(s).toMatchObject({
      roman: 'plian',
      initial: { thai: 'ปล', roman: 'pl' },
      vowel: { thai: 'เ-ีย', roman: 'ia', implicit: false },
      final: { thai: 'น', roman: 'n' },
      rules: ['true-cluster'],
    });
  });
  it('marks silent letters', () => {
    const [s] = syllabify('จันทร์');
    expect(s?.silent).toBe('ทร์');
    expect(s?.rules).toContain('karan');
  });
});
