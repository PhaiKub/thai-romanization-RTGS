import { Dictionary } from './dictionary';
import { BANGKOK_DISTRICTS } from './data/bangkok-districts';
import { COMMON_WORDS } from './data/common-words';
import { GIVEN_NAMES, NAME_PARTS } from './data/given-names';
import { PROVINCES } from './data/provinces';

let builtin: Dictionary | undefined;

/** The built-in dictionary (provinces, Bangkok districts, irregular words, given names), built on first use. Shared — do not modify. */
export function getBuiltinDictionary(): Dictionary {
  builtin ??= new Dictionary({ ...NAME_PARTS, ...GIVEN_NAMES, ...COMMON_WORDS, ...BANGKOK_DISTRICTS, ...PROVINCES });
  return builtin;
}

export const BUILTIN_SOURCES = { provinces: PROVINCES, bangkokDistricts: BANGKOK_DISTRICTS, commonWords: COMMON_WORDS, givenNames: GIVEN_NAMES, nameParts: NAME_PARTS } as const;
