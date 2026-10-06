import type { RomanizeOptions, ResolvedOptions } from './types';

export const DEFAULT_OPTIONS: Readonly<ResolvedOptions> = Object.freeze({
  case: 'lower',
  wordSeparator: ' ',
  syllableSeparator: '',
  hyphenateAmbiguous: true,
  thaiDigits: 'arabic',
  maiYamok: 'repeat',
  paiyannoi: 'drop',
  keepNonThai: true,
  useBuiltinDictionary: true,
  segmenter: 'intl',
  dictionary: undefined,
});

const ALLOWED = {
  case: ['lower', 'upper', 'title', 'sentence'],
  thaiDigits: ['arabic', 'keep'],
  maiYamok: ['repeat', 'keep', 'drop'],
  paiyannoi: ['drop', 'keep'],
  segmenter: ['intl', 'dictionary', 'none'],
} as const;

function check<K extends keyof typeof ALLOWED>(key: K, value: unknown): void {
  if (value === undefined) return;
  if (key === 'segmenter' && typeof value === 'function') return;
  if (!(ALLOWED[key] as readonly unknown[]).includes(value)) {
    throw new TypeError(`Invalid option ${key}: ${JSON.stringify(value)}. Expected one of ${ALLOWED[key].join(', ')}`);
  }
}

/** Merge options over defaults (later wins) and validate them. `dictionary` entries are merged, not replaced. */
export function resolveOptions(...layers: (RomanizeOptions | undefined)[]): ResolvedOptions {
  const out: ResolvedOptions = { ...DEFAULT_OPTIONS };
  for (const layer of layers) {
    if (!layer) continue;
    for (const key of Object.keys(ALLOWED) as (keyof typeof ALLOWED)[]) check(key, layer[key]);
    for (const [k, v] of Object.entries(layer)) {
      if (v === undefined) continue;
      if (k === 'dictionary') {
        out.dictionary = { ...(out.dictionary ?? {}), ...(v as Record<string, string>) };
      } else if (k in DEFAULT_OPTIONS) {
        (out as Record<string, unknown>)[k] = v;
      }
    }
  }
  return out;
}
