/**
 * THE mastered-letter rule. Every decoding activity filters its content
 * through these functions — never bypass them in a screen.
 */
import { getSoundByText, LETTERS, MINI_STORIES, SENTENCES, STORIES, WORDS } from './content';
import type { DecodableWord, MiniStory, Sentence, Story, VowelledSound } from './types';

export type LetterSet = ReadonlySet<string>;

/** True ONLY if every required base letter is mastered. */
export function isWordEligible(word: Pick<DecodableWord, 'requiredLetters'>, masteredLetters: LetterSet): boolean {
  return word.requiredLetters.length > 0 && word.requiredLetters.every((l) => masteredLetters.has(l));
}

/**
 * Level-2 words additionally require that every long segment's letter has
 * completed the long-vowel lesson.
 */
export function isLongWordEligible(word: DecodableWord, masteredLetters: LetterSet, longMasteredLetters: LetterSet): boolean {
  if (!isWordEligible(word, masteredLetters)) return false;
  return word.segments.every((seg) => {
    const sound = getSoundByText(seg);
    if (!sound) return false;
    if (sound.length === 'short') return true;
    const letter = LETTERS.find((l) => l.id === sound.letterId);
    return !!letter && longMasteredLetters.has(letter.char);
  });
}

export function isSentenceEligible(sentence: Pick<Sentence, 'requiredLetters'>, masteredLetters: LetterSet): boolean {
  return isWordEligible(sentence, masteredLetters);
}

export function isStoryEligible(story: Pick<Story, 'letter'>, masteredLetters: LetterSet): boolean {
  return masteredLetters.has(story.letter);
}

export function eligibleShortWords(masteredLetters: LetterSet): DecodableWord[] {
  return WORDS.filter((w) => w.level === 1 && isWordEligible(w, masteredLetters));
}

export function eligibleLongWords(masteredLetters: LetterSet, longMasteredLetters: LetterSet): DecodableWord[] {
  return WORDS.filter((w) => w.level === 2 && isLongWordEligible(w, masteredLetters, longMasteredLetters));
}

export function eligibleStories(masteredLetters: LetterSet): Story[] {
  return STORIES.filter((s) => isStoryEligible(s, masteredLetters));
}

export function eligibleSentences(masteredLetters: LetterSet): Sentence[] {
  return SENTENCES.filter((s) => isSentenceEligible(s, masteredLetters));
}

export function eligibleMiniStories(masteredLetters: LetterSet): MiniStory[] {
  return MINI_STORIES.filter((m) => isWordEligible(m, masteredLetters));
}

/** All short vowelled sounds the child has mastered (for banks / distractors). */
export function masteredShortSounds(masteredLetters: LetterSet): VowelledSound[] {
  return LETTERS.filter((l) => masteredLetters.has(l.char)).flatMap((l) => l.forms);
}

export function masteredLongSounds(longMasteredLetters: LetterSet): VowelledSound[] {
  return LETTERS.filter((l) => longMasteredLetters.has(l.char)).flatMap((l) => l.longForms);
}
