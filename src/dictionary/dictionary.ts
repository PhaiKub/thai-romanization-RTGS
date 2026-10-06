import { normalizeThai } from '../text/normalize';

export interface DictionaryEntry {
  thai: string;
  /** The RTGS as stored, e.g. `krung thep ma-ha na-khon`. */
  roman: string;
  /** Words, each split into syllables: `[['krung'], ['thep'], ['ma', 'ha'], ['na', 'khon']]`. */
  words: string[][];
}

/**
 * Parse an entry's RTGS: spaces separate words, `-` separates syllables.
 * A `-` that RTGS itself requires is written the same way and kept by `hyphenateAmbiguous`.
 */
export function parseRoman(roman: string): string[][] {
  return roman
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.split('-').filter(Boolean));
}

interface TrieNode {
  next: Map<string, TrieNode>;
  word?: string;
}

/**
 * One layer of Thai → RTGS entries. A layer can also hide a word from the layers below it
 * (`delete` on a word it does not own), which is how a user removes a built-in entry.
 */
export class Dictionary {
  private readonly map = new Map<string, DictionaryEntry | null>();
  private readonly root: TrieNode = { next: new Map() };
  private longest = 0;

  constructor(entries?: Record<string, string> | Iterable<readonly [string, string]>) {
    if (entries) this.add(entries);
  }

  /** Add or replace one entry. `roman` uses spaces between words and `-` between syllables. */
  set(thai: string, roman: string): this {
    const key = normalizeThai(thai.trim());
    if (!key) throw new TypeError('Dictionary key must be a non-empty Thai word');
    const words = parseRoman(roman);
    if (words.length === 0) throw new TypeError(`Dictionary entry for "${thai}" has an empty romanization`);
    this.map.set(key, { thai: key, roman: roman.trim().toLowerCase(), words });
    this.index(key);
    return this;
  }

  add(entries: Record<string, string> | Iterable<readonly [string, string]>): this {
    const list = Symbol.iterator in entries ? (entries as Iterable<readonly [string, string]>) : Object.entries(entries);
    for (const [thai, roman] of list) this.set(thai, roman);
    return this;
  }

  /** Remove a word. Returns true if this layer had it. With `hide`, also mask the word in lower layers. */
  delete(thai: string, hide = false): boolean {
    const key = normalizeThai(thai.trim());
    const had = this.map.get(key) != null;
    if (hide) {
      this.map.set(key, null);
      this.index(key);
    } else {
      this.map.delete(key);
    }
    return had;
  }

  /** `undefined`: not in this layer; `null`: hidden by this layer. */
  lookup(thai: string): DictionaryEntry | null | undefined {
    return this.map.get(thai);
  }

  get(thai: string): DictionaryEntry | undefined {
    return this.map.get(normalizeThai(thai)) ?? undefined;
  }

  has(thai: string): boolean {
    return this.get(thai) !== undefined;
  }

  get size(): number {
    let n = 0;
    for (const v of this.map.values()) if (v) n++;
    return n;
  }

  get maxLength(): number {
    return this.longest;
  }

  *entries(): IterableIterator<[string, string]> {
    for (const [k, v] of this.map) if (v) yield [k, v.roman];
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(this.entries());
  }

  /** Every key of this layer (including hidden ones) that starts at `start` in `text`, longest first. */
  matchesAt(text: string, start: number): string[] {
    const found: string[] = [];
    let node: TrieNode | undefined = this.root;
    for (let i = start; i < text.length && node; i++) {
      node = node.next.get(text[i] as string);
      if (node?.word) found.push(node.word);
    }
    return found.reverse();
  }

  private index(key: string): void {
    let node = this.root;
    for (const ch of key) {
      let child = node.next.get(ch);
      if (!child) {
        child = { next: new Map() };
        node.next.set(ch, child);
      }
      node = child;
    }
    node.word = key;
    if (key.length > this.longest) this.longest = key.length;
  }
}

/** Dictionaries searched top to bottom; the first layer that knows a word (or hides it) decides. */
export class DictionaryStack {
  constructor(readonly layers: readonly Dictionary[]) {}

  get(thai: string): DictionaryEntry | undefined {
    for (const layer of this.layers) {
      const hit = layer.lookup(thai);
      if (hit !== undefined) return hit ?? undefined;
    }
    return undefined;
  }

  get maxLength(): number {
    return Math.max(0, ...this.layers.map((l) => l.maxLength));
  }

  /** Longest dictionary word starting at `start`, of at least `minLength` letters. */
  longestMatchAt(text: string, start: number, minLength = 1): string | undefined {
    let best: string | undefined;
    for (const layer of this.layers) {
      for (const word of layer.matchesAt(text, start)) {
        if (word.length < minLength || (best && word.length <= best.length)) break;
        if (this.get(word)) {
          best = word;
          break;
        }
      }
    }
    return best;
  }
}
