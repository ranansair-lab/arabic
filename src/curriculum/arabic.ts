/**
 * Low-level Arabic text utilities.
 *
 * Diacritics are NEVER stripped from anything shown to the child. These helpers
 * only *read* the vowelled text so the curriculum can reason about it
 * (segmentation, required letters, eligibility).
 */

export const FATHA = 'َ';
export const DAMMA = 'ُ';
export const KASRA = 'ِ';
export const SUKUN = 'ْ';
export const SHADDA = 'ّ';
export const FATHATAN = 'ً';
export const DAMMATAN = 'ٌ';
export const KASRATAN = 'ٍ';
export const SUPERSCRIPT_ALEF = 'ٰ';

export const ALIF = 'ا';
export const WAW = 'و';
export const YAA = 'ي';
export const ALIF_MADDA = 'آ';

export type ShortVowel = 'fatha' | 'kasra' | 'damma';
export type VowelLength = 'short' | 'long';

export const VOWEL_MARK: Record<ShortVowel, string> = {
  fatha: FATHA,
  kasra: KASRA,
  damma: DAMMA,
};

/** The madd letter that lengthens each short vowel. */
export const MADD_LETTER: Record<ShortVowel, string> = {
  fatha: ALIF,
  kasra: YAA,
  damma: WAW,
};

const MARK_TO_VOWEL: Record<string, ShortVowel> = {
  [FATHA]: 'fatha',
  [KASRA]: 'kasra',
  [DAMMA]: 'damma',
};

const DIACRITIC_RE = /[ً-ْٰ]/;

export function isDiacritic(ch: string): boolean {
  return DIACRITIC_RE.test(ch);
}

/**
 * Maps every written base-letter shape to the curriculum letter (its glyph as
 * shown on the home screen). Hamza seats all belong to the letter أ, and
 * taa marbuta belongs to ت. Plain alif (ا) and alif maqsura (ى) are madd
 * letters, not consonants, so they map to null.
 */
const BASE_TO_LETTER: Record<string, string | null> = {
  'أ': 'أ', 'إ': 'أ', 'آ': 'أ', 'ء': 'أ', 'ؤ': 'أ', 'ئ': 'أ',
  'ا': null, 'ى': null,
  'ب': 'ب', 'ت': 'ت', 'ة': 'ت', 'ث': 'ث', 'ج': 'ج', 'ح': 'ح', 'خ': 'خ',
  'د': 'د', 'ذ': 'ذ', 'ر': 'ر', 'ز': 'ز', 'س': 'س', 'ش': 'ش', 'ص': 'ص',
  'ض': 'ض', 'ط': 'ط', 'ظ': 'ظ', 'ع': 'ع', 'غ': 'غ', 'ف': 'ف', 'ق': 'ق',
  'ك': 'ك', 'ل': 'ل', 'م': 'م', 'ن': 'ن', 'ه': 'ه', 'و': 'و', 'ي': 'ي',
};

export function isArabicBaseLetter(ch: string): boolean {
  return ch in BASE_TO_LETTER;
}

/** Curriculum letter glyph for a written base character (null for madd letters). */
export function letterOfBase(ch: string): string | null {
  if (!(ch in BASE_TO_LETTER)) {
    throw new Error(`Unsupported Arabic character: "${ch}" (U+${ch.codePointAt(0)?.toString(16)})`);
  }
  return BASE_TO_LETTER[ch];
}

export interface Segment {
  /** Exactly as written, with its diacritic(s), e.g. "كَ" or "مَا". */
  text: string;
  /** Curriculum letter glyph, e.g. "ك" (hamza seats → "أ"). */
  letter: string;
  vowel: ShortVowel;
  length: VowelLength;
}

export class DecodingError extends Error {}

/**
 * Splits a fully vowelled decodable word into vowelled-letter segments.
 *
 * Supported (Level 1 + Level 2 only):
 *   consonant + short vowel          → short segment   (كَ)
 *   consonant + fatha + ا            → long segment    (مَا)
 *   consonant + kasra + ي (no mark)  → long segment    (مِي)
 *   consonant + damma + و (no mark)  → long segment    (مُو)
 *   آ                                → long hamza-fatha
 *
 * Anything requiring a later skill (sukun, shadda, tanween, ال…) throws,
 * so un-teachable content can never slip into a decoding activity.
 */
export function segmentWord(word: string): Segment[] {
  const chars = Array.from(word.normalize('NFC'));
  const segments: Segment[] = [];
  let i = 0;
  while (i < chars.length) {
    const base = chars[i];
    if (base === ALIF_MADDA) {
      segments.push({ text: base, letter: 'أ', vowel: 'fatha', length: 'long' });
      i += 1;
      continue;
    }
    if (!isArabicBaseLetter(base) || isDiacritic(base)) {
      throw new DecodingError(`Unexpected character "${base}" in "${word}"`);
    }
    const letter = letterOfBase(base);
    if (letter === null) {
      throw new DecodingError(`Madd letter "${base}" without a preceding vowelled consonant in "${word}"`);
    }
    const marks: string[] = [];
    let j = i + 1;
    while (j < chars.length && isDiacritic(chars[j])) {
      marks.push(chars[j]);
      j += 1;
    }
    if (marks.length !== 1 || !(marks[0] in MARK_TO_VOWEL)) {
      throw new DecodingError(
        `Letter "${base}" in "${word}" must carry exactly one short vowel (found ${marks.length ? marks.map((m) => 'U+' + m.codePointAt(0)!.toString(16)).join(',') : 'none'})`,
      );
    }
    const vowel = MARK_TO_VOWEL[marks[0]];
    let text = base + marks[0];
    let length: VowelLength = 'short';
    const next = chars[j];
    const afterNext = chars[j + 1];
    if (next !== undefined && next === MADD_LETTER[vowel] && (afterNext === undefined || !isDiacritic(afterNext))) {
      text += next;
      length = 'long';
      j += 1;
    }
    segments.push({ text, letter, vowel, length });
    i = j;
  }
  return segments;
}

/** Splits a decodable sentence into words (keeps diacritics, drops punctuation). */
export function sentenceWords(sentence: string): string[] {
  return sentence
    .replace(/[.!؟?،,:؛]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Counts consonant letters as heard in running text (stories). Madd alif and
 * alif maqsura are skipped; hamza seats count as أ; taa marbuta as ت.
 */
export function countLetters(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of Array.from(text.normalize('NFC'))) {
    if (!isArabicBaseLetter(ch)) continue;
    if (ch === 'ة') continue; // pausal taa marbuta is not heard as /t/
    const letter = letterOfBase(ch);
    if (!letter) continue;
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return counts;
}

/** Removes diacritics — ONLY for internal comparison/keys, never for display. */
export function stripDiacriticsForKey(text: string): string {
  return text.replace(/[ً-ْٰ]/g, '');
}
