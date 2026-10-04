/**
 * Pure activity generators (no UI, no storage). Every source of sounds or
 * letters passed in here must already be filtered by the mastered-letter rule.
 */
import { countLetters } from './arabic';
import { getSoundByText, LETTERS } from './content';
import { shuffle, shuffleChanged, type Rng, defaultRng } from './random';
import type { DecodableWord, Letter, Story, VowelledSound } from './types';

// ---------------------------------------------------------------------------
// Letter lesson — sound discrimination
// ---------------------------------------------------------------------------

/** Level 1: the three short forms of the same letter, shuffled. */
export function shortDiscriminationChoices(letter: Letter, rng: Rng = defaultRng): VowelledSound[] {
  return shuffleChanged(letter.forms, rng);
}

/**
 * Level 2: the long target, its short counterpart (the key contrast) and one
 * other long form of the same letter.
 */
export function longDiscriminationChoices(letter: Letter, target: VowelledSound, rng: Rng = defaultRng): VowelledSound[] {
  const idx = letter.longForms.findIndex((f) => f.id === target.id);
  const shortCounterpart = letter.forms[idx];
  const otherLong = letter.longForms[(idx + 1) % 3];
  return shuffleChanged([target, shortCounterpart, otherLong], rng);
}

// ---------------------------------------------------------------------------
// تَرْكِيبُ كَلِمَةٍ — word building bank
// ---------------------------------------------------------------------------

export interface Tile {
  key: string;
  text: string;
}

/**
 * The sound bank: every segment of the word (duplicates kept) plus distractors
 * drawn ONLY from `availableSounds` (mastered sounds). Distractors that share a
 * letter with the word but differ in vowel come first — they train listening
 * for the vowel.
 */
export function buildSoundBank(
  word: DecodableWord,
  availableSounds: readonly VowelledSound[],
  rng: Rng = defaultRng,
  bankSize = 6,
): Tile[] {
  const targetTexts = new Set(word.segments);
  const wordLetters = new Set(word.requiredLetters);
  const letterOfSound = (s: VowelledSound) => LETTERS.find((l) => l.id === s.letterId)?.char ?? '';
  const pool = availableSounds.filter((s) => !targetTexts.has(s.text));
  const sameLetter = shuffle(pool.filter((s) => wordLetters.has(letterOfSound(s))), rng);
  const other = shuffle(pool.filter((s) => !wordLetters.has(letterOfSound(s))), rng);
  const needed = Math.max(0, Math.max(bankSize, word.segments.length + 2) - word.segments.length);
  const distractors: VowelledSound[] = [];
  // Alternate same-letter and other-letter distractors for variety.
  while (distractors.length < needed && (sameLetter.length || other.length)) {
    const next = (distractors.length % 2 === 0 ? sameLetter.shift() : other.shift()) ?? sameLetter.shift() ?? other.shift();
    if (next && !distractors.some((d) => d.text === next.text)) distractors.push(next);
  }
  const tiles: Tile[] = [
    ...word.segments.map((text, i) => ({ key: `t${i}-${text}`, text })),
    ...distractors.map((d, i) => ({ key: `d${i}-${d.text}`, text: d.text })),
  ];
  return shuffleChanged(tiles, rng);
}

export function isBuildCorrect(word: DecodableWord, placed: readonly string[]): boolean {
  return placed.length === word.segments.length && placed.every((t, i) => t === word.segments[i]);
}

// ---------------------------------------------------------------------------
// كَلِمَاتِي — word analysis
// ---------------------------------------------------------------------------

export type AnalysisKind = 'first' | 'middle' | 'last';

export const ANALYSIS_INSTRUCTION: Record<AnalysisKind, string> = {
  first: 'first_sound',
  middle: 'middle_sound',
  last: 'last_sound',
};

export interface AnalysisQuestion {
  kind: AnalysisKind;
  answer: string;
  choices: string[];
}

export function analysisKindsFor(word: DecodableWord): AnalysisKind[] {
  const n = word.segments.length;
  if (n >= 3 && n % 2 === 1) return ['first', 'last', 'middle'];
  return ['first', 'last'];
}

export function analysisQuestion(
  word: DecodableWord,
  kind: AnalysisKind,
  availableSounds: readonly VowelledSound[],
  rng: Rng = defaultRng,
): AnalysisQuestion {
  const n = word.segments.length;
  const answer = kind === 'first' ? word.segments[0] : kind === 'last' ? word.segments[n - 1] : word.segments[Math.floor(n / 2)];
  const others = shuffle([...new Set(word.segments.filter((s) => s !== answer))], rng);
  const choices = [answer, ...others.slice(0, 2)];
  if (choices.length < 3) {
    // Not enough distinct segments (e.g. two-sound words): add mastered sounds,
    // preferring the same letter with a different vowel.
    const answerSound = getSoundByText(answer);
    const pool = availableSounds.filter((s) => !choices.includes(s.text));
    const same = shuffle(pool.filter((s) => s.letterId === answerSound?.letterId), rng);
    const rest = shuffle(pool.filter((s) => s.letterId !== answerSound?.letterId), rng);
    for (const s of [...same, ...rest]) {
      if (choices.length >= 3) break;
      choices.push(s.text);
    }
  }
  return { kind, answer, choices: shuffleChanged(choices, rng) };
}

// ---------------------------------------------------------------------------
// قِصَّةُ حَرْفٍ — "which letter did you hear most?"
// ---------------------------------------------------------------------------

/**
 * Target letter + two clearly less-frequent letters. Mastered letters are
 * preferred as distractors; otherwise the rarest letters in the story are used.
 */
export function storyLetterChoices(story: Story, masteredLetters: ReadonlySet<string>, rng: Rng = defaultRng): string[] {
  const counts = countLetters(story.sentences.join(' '));
  const targetCount = counts.get(story.letter) ?? 0;
  const candidates = LETTERS.map((l) => l.char).filter(
    (c) => c !== story.letter && (counts.get(c) ?? 0) <= Math.floor(targetCount / 2),
  );
  const ranked = shuffle(candidates, rng).sort((a, b) => {
    const ma = masteredLetters.has(a) ? 0 : 1;
    const mb = masteredLetters.has(b) ? 0 : 1;
    if (ma !== mb) return ma - mb;
    return (counts.get(a) ?? 0) - (counts.get(b) ?? 0);
  });
  return shuffleChanged([story.letter, ...ranked.slice(0, 2)], rng);
}

// ---------------------------------------------------------------------------
// Queues
// ---------------------------------------------------------------------------

/** Not-yet-practised items first (shuffled), then the rest (shuffled). */
export function practiceQueue<T extends { id: string }>(items: readonly T[], doneCounts: Record<string, unknown>, rng: Rng = defaultRng): T[] {
  const fresh = shuffle(items.filter((i) => !doneCounts[i.id]), rng);
  const seen = shuffle(items.filter((i) => doneCounts[i.id]), rng);
  return [...fresh, ...seen];
}
