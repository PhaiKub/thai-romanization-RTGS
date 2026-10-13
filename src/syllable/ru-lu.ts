import { isConsonant } from '../text/chars';
import { INITIAL, RU_AS_ARUE_AFTER, RU_AS_RUE_AFTER } from '../transcribe/tables';
import type { Candidate } from './candidate';
import { assemble, codasAt, type Coda } from './codas';
import { COST } from './costs';

/** ฤ / ฦ, alone or after a consonant (ฤดู rue-du, อังกฤษ ang-krit, พฤหัส phrue-hat). */
export function ruLuCandidates(w: string, i: number, out: Candidate[]): void {
  const none = (end: number): Coda => ({ final: '', silent: '', end, cost: 0, rules: [] });
  const push = (c: Candidate | undefined) => {
    if (c) out.push(c);
  };
  const silentInitial = { thai: '', roman: '' };
  const c = w[i];
  if (c === 'ฦ') {
    const end = w[i + 1] === 'ๅ' || w[i + 1] === 'า' ? i + 2 : i + 1;
    push(assemble(i, silentInitial, { thai: w.slice(i, end), roman: 'lue', implicit: false }, none(end), 'none', COST.ruLu, ['ru-lu']));
    return;
  }
  if (c === 'ฤ') {
    // ฤา is a common spelling of ฤๅ (ฤาษี rue-si).
    if (w[i + 1] === 'ๅ' || w[i + 1] === 'า') {
      push(assemble(i, silentInitial, { thai: w.slice(i, i + 2), roman: 'rue', implicit: false }, none(i + 2), 'none', COST.ruLu, ['ru-lu']));
      return;
    }
    for (const coda of codasAt(w, i + 1, 'none')) {
      push(assemble(i, silentInitial, { thai: 'ฤ', roman: 'rue', implicit: false }, coda, 'none', COST.ruLu, ['ru-lu']));
    }
    for (const coda of codasAt(w, i + 1, 'required')) {
      push(assemble(i, silentInitial, { thai: 'ฤ', roman: 'ri', implicit: false }, coda, 'required', COST.ruLu + 3, ['ru-lu']));
    }
    return;
  }
  if (c !== undefined && isConsonant(c) && w[i + 1] === 'ฤ') {
    const roman = RU_AS_ARUE_AFTER.has(c) ? 'arue' : RU_AS_RUE_AFTER.has(c) ? 'rue' : 'ri';
    for (const coda of codasAt(w, i + 2, 'optional')) {
      push(assemble(i, { thai: c, roman: INITIAL[c] ?? '' }, { thai: '-ฤ', roman, implicit: false }, coda, 'optional', COST.ruLu, ['ru-lu']));
    }
  }
}
