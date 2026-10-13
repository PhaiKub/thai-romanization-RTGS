/**
 * Finds personal names in running text. Thai has no spaces between words and Intl.Segmenter does not know
 * names, so it cuts them into fragments (วิชุดา → วิ|ชุ|ดา). Formal Thai writes a name after a title, the
 * given name joined to the title and the surname after one space: "นางสาววิชุดา ใจดี". After a title, the
 * given name and the surname are each read as one word.
 */

/** Titles written directly before a given name, longest first so นางสาว wins over นาง. */
export const NAME_TITLES: readonly string[] = ['นางสาว', 'เด็กชาย', 'เด็กหญิง', 'นาย', 'นาง'];
const SHORT_TITLES: ReadonlySet<string> = new Set(['นาย', 'นาง']);

/**
 * Common words that start with a title but are not followed by a name, which the segmenter may still cut
 * after the title (นาง|พยาบาล). Words it keeps whole (นายก, นายจ้าง, นางฟ้า) need no entry.
 */
const TITLE_WORDS: readonly string[] = [
  'นางพยาบาล', 'นางแบบ', 'นางงาม', 'นางเอก', 'นางร้าย', 'นางรำ', 'นางสนม', 'นางกำนัล', 'นางสาวใช้',
  'นายแพทย์', 'นายทหาร', 'นายตำรวจ', 'นายอำเภอ', 'นายกเทศมนตรี', 'นายหน้า', 'นายทุน', 'นายพราน', 'นายท้าย', 'นายประกัน',
];

/** Abbreviated titles, written with dots and usually followed by a space: ดร. สมชาย ใจดี */
const ABBREVIATED_TITLES: ReadonlySet<string> = new Set(['น.ส.', 'ด.ช.', 'ด.ญ.', 'ดร.', 'ศ.', 'รศ.', 'ผศ.', 'นพ.', 'พญ.']);

/** Whether one of the words ends exactly `length` letters into the run (เด็ก|หญิง|จินนา ends a word at 8). */
function endsWordAt(words: string[], length: number): boolean {
  let at = 0;
  for (const w of words) {
    at += w.length;
    if (at >= length) return at === length;
  }
  return false;
}

export interface NamePart {
  text: string;
  /** Part of a personal name, read as one word. */
  name: boolean;
}

/** Tracks titles across tokens; feed it every token in order. */
export class NameTracker {
  /** A title was just seen: the next Thai run is a given name. */
  private givenNext = false;
  /** A given name was just read: a Thai run after a single space is the surname. */
  private surnameNext = false;
  private singleSpaceBefore = false;
  /** Thai letters and punctuation since the last space, to recognise abbreviated titles (น.ส.). */
  private recent = '';

  /**
   * Split a Thai run into words when it holds a name; `undefined` when ordinary segmentation applies.
   * `segment` is the word segmenter: a title only counts when it ends on a word boundary, which tells the
   * title นาย in นายสมชาย from the word นายก in นายกรัฐมนตรี.
   */
  thai(text: string, segment: (run: string) => string[]): NamePart[] | undefined {
    const singleSpace = this.singleSpaceBefore;
    this.singleSpaceBefore = false;
    this.recent += text;

    if (this.givenNext) {
      this.givenNext = false;
      this.surnameNext = true;
      return [{ text, name: true }];
    }
    if (this.surnameNext) {
      this.surnameNext = false;
      if (singleSpace) return [{ text, name: true }];
    }

    const title = NAME_TITLES.find((t) => text.startsWith(t));
    if (!title) return undefined;
    if (text === title) {
      this.givenNext = true;
      return undefined;
    }
    if (TITLE_WORDS.some((w) => text.startsWith(w))) return undefined;
    // Only นาย and นาง also begin ordinary words (นายก, นางฟ้า); the segmenter may cut the longer titles badly
    // (นาง|สา|วนิธิศ), so they are trusted as they are.
    if (SHORT_TITLES.has(title) && !endsWordAt(segment(text), title.length)) return undefined;
    this.surnameNext = true;
    return [
      { text: title, name: false },
      { text: text.slice(title.length), name: true },
    ];
  }

  space(text: string): void {
    this.recent = '';
    this.singleSpaceBefore = text === ' ';
    if (text.includes('\n')) this.reset();
  }

  punct(text: string): void {
    this.singleSpaceBefore = false;
    this.recent += text;
    if (ABBREVIATED_TITLES.has(this.recent)) {
      this.givenNext = true;
      this.surnameNext = false;
    } else if (text !== '.') {
      this.reset();
    }
  }

  /** Any other token ends a name. */
  other(): void {
    this.reset();
  }

  private reset(): void {
    this.givenNext = false;
    this.surnameNext = false;
    this.singleSpaceBefore = false;
    this.recent = '';
  }
}
