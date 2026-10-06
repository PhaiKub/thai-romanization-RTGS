import type { CaseStyle } from '../types';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Apply letter case to one romanized Thai word (which may hold several space-separated words from a
 * dictionary entry). `sentence` lower-cases here; the romanizer capitalizes sentence starts.
 */
export function applyCase(text: string, style: CaseStyle, separator: string): string {
  switch (style) {
    case 'upper':
      return text.toUpperCase();
    case 'title': {
      const lower = text.toLowerCase();
      if (separator && separator !== ' ') return lower.split(separator).map(capitalize).join(separator);
      return lower.replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toUpperCase());
    }
    default:
      return text.toLowerCase();
  }
}

export { capitalize };
