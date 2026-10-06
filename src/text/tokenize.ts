import type { TokenType } from '../types';
import { isThaiDigit, isThaiLetter, MAI_YAMOK, PAIYANNOI } from './chars';

export interface RawToken {
  type: TokenType;
  text: string;
  start: number;
  end: number;
}

const ETC = 'ฯลฯ';

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= '0' && ch <= '9') || isThaiDigit(ch));
}

function isSpace(ch: string): boolean {
  return /\s/.test(ch);
}

function isLatinLetter(ch: string): boolean {
  return /\p{L}|\p{M}/u.test(ch) && !isThaiLetter(ch);
}

/**
 * Split text into runs of Thai letters, Latin letters, numbers, whitespace and punctuation.
 * ๆ, ฯ and ฯลฯ become their own tokens so they never reach the syllable parser.
 * A `.` or `,` between digits stays in the number (1,000.50).
 */
export function tokenize(text: string): RawToken[] {
  const tokens: RawToken[] = [];
  const chars = [...text];
  let offset = 0;
  let i = 0;

  const push = (type: TokenType, len: number) => {
    let s = '';
    for (let k = 0; k < len; k++) s += chars[i + k];
    const last = tokens[tokens.length - 1];
    const mergeable = type === 'thai' || type === 'latin' || type === 'number' || type === 'space' || type === 'punct';
    if (last && last.type === type && mergeable && last.end === offset) {
      last.text += s;
      last.end += s.length;
    } else {
      tokens.push({ type, text: s, start: offset, end: offset + s.length });
    }
    offset += s.length;
    i += len;
  };

  while (i < chars.length) {
    const ch = chars[i] as string;
    if (ch === PAIYANNOI && chars.slice(i, i + 3).join('') === ETC) push('etc', 3);
    else if (ch === PAIYANNOI) push('paiyannoi', 1);
    else if (ch === MAI_YAMOK) push('mai-yamok', 1);
    else if (isThaiLetter(ch)) push('thai', 1);
    else if (isDigit(ch)) push('number', 1);
    else if ((ch === '.' || ch === ',') && isDigit(chars[i - 1]) && isDigit(chars[i + 1]) && tokens[tokens.length - 1]?.type === 'number') push('number', 1);
    else if (isSpace(ch)) push('space', 1);
    else if (isLatinLetter(ch)) push('latin', 1);
    else push('punct', 1);
  }
  return tokens;
}
