import { CURRICULUM_RULES } from '../../curriculum/levels';
import { LETTERS } from '../../curriculum/content';
import { eligibleSentences } from '../../curriculum/eligibility';
import type { Letter } from '../../curriculum/types';
import type { ProgressState } from './model';

export function completedShortForms(state: ProgressState, letter: Letter): number {
  return letter.forms.filter((f) => state.completedForms[f.id]).length;
}

export function completedLongForms(state: ProgressState, letter: Letter): number {
  return letter.longForms.filter((f) => state.completedForms[f.id]).length;
}

/** Mastery is DERIVED from completed forms, so it can never get out of sync. */
export function isLetterMastered(state: ProgressState, letter: Letter): boolean {
  return completedShortForms(state, letter) === letter.forms.length;
}

export function isLongLetterMastered(state: ProgressState, letter: Letter): boolean {
  return isLetterMastered(state, letter) && completedLongForms(state, letter) === letter.longForms.length;
}

/** Set of mastered letter glyphs, e.g. {"م","ب"}. */
export function masteredLetters(state: ProgressState): Set<string> {
  return new Set(LETTERS.filter((l) => isLetterMastered(state, l)).map((l) => l.char));
}

export function longMasteredLetters(state: ProgressState): Set<string> {
  return new Set(LETTERS.filter((l) => isLongLetterMastered(state, l)).map((l) => l.char));
}

export function distinctWordsPractised(state: ProgressState): number {
  return new Set([...Object.keys(state.wordsBuilt), ...Object.keys(state.wordsAnalysed)]).size;
}

export function isLongVowelLevelUnlocked(state: ProgressState): boolean {
  return masteredLetters(state).size >= CURRICULUM_RULES.longVowelUnlockLetters;
}

export function isSentenceLevelUnlocked(state: ProgressState): boolean {
  return (
    distinctWordsPractised(state) >= CURRICULUM_RULES.sentenceUnlockWords &&
    eligibleSentences(masteredLetters(state)).length > 0
  );
}

export function isMiniStoryLevelUnlocked(state: ProgressState): boolean {
  return isSentenceLevelUnlocked(state) && Object.keys(state.sentencesRead).length >= CURRICULUM_RULES.miniStoryUnlockSentences;
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  earned: boolean;
}

export function badges(state: ProgressState): Badge[] {
  const m = masteredLetters(state).size;
  const built = Object.keys(state.wordsBuilt).length;
  const analysed = Object.keys(state.wordsAnalysed).length;
  const stories = Object.keys(state.storiesCompleted).length;
  return [
    { id: 'first_letter', emoji: '🌱', title: 'حَرْفِي الْأَوَّلُ', earned: m >= 1 },
    { id: 'five_letters', emoji: '🌼', title: '٥ حُرُوفٍ', earned: m >= 5 },
    { id: 'ten_letters', emoji: '🌳', title: '١٠ حُرُوفٍ', earned: m >= 10 },
    { id: 'all_letters', emoji: '🏆', title: 'كُلُّ الْحُرُوفِ', earned: m >= LETTERS.length },
    { id: 'first_word', emoji: '🧩', title: 'كَلِمَتِي الْأُولَى', earned: built >= 1 },
    { id: 'ten_words', emoji: '🧱', title: '١٠ كَلِمَاتٍ', earned: built >= 10 },
    { id: 'analyst', emoji: '🔍', title: 'مُحَلِّلُ الْكَلِمَاتِ', earned: analysed >= 5 },
    { id: 'first_story', emoji: '📖', title: 'قِصَّتِي الْأُولَى', earned: stories >= 1 },
    { id: 'long_vowels', emoji: '🎵', title: 'حُرُوفُ الْمَدِّ', earned: longMasteredLetters(state).size >= 1 },
    { id: 'reader', emoji: '📝', title: 'قَارِئٌ صَغِيرٌ', earned: Object.keys(state.sentencesRead).length >= 3 },
  ];
}
