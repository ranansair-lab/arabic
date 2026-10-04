import lettersJson from '../data/letters.json';
import wordsJson from '../data/words.json';
import storiesJson from '../data/stories.json';
import sentencesJson from '../data/sentences.json';
import miniStoriesJson from '../data/mini-stories.json';
import instructionsJson from '../data/instructions.json';
import soundWordsJson from '../data/sound-words.json';
import type { DecodableWord, Instruction, Letter, MiniStory, Sentence, SoundWord, Story, VowelledSound } from './types';

export const LETTERS = lettersJson as Letter[];
export const WORDS = wordsJson as DecodableWord[];
export const STORIES = storiesJson as Story[];
export const SENTENCES = sentencesJson as Sentence[];
export const MINI_STORIES = miniStoriesJson as MiniStory[];
export const INSTRUCTIONS = instructionsJson as Instruction[];
export const SOUND_WORDS = soundWordsJson as SoundWord[];

const letterById = new Map(LETTERS.map((l) => [l.id, l]));
const letterByChar = new Map(LETTERS.map((l) => [l.char, l]));
const soundById = new Map<string, VowelledSound>(
  LETTERS.flatMap((l) => [...l.forms, ...l.longForms]).map((f) => [f.id, f]),
);
const soundByText = new Map<string, VowelledSound>(
  LETTERS.flatMap((l) => [...l.forms, ...l.longForms]).map((f) => [f.text, f]),
);
const instructionById = new Map(INSTRUCTIONS.map((i) => [i.id, i]));
const sentenceById = new Map(SENTENCES.map((s) => [s.id, s]));

export function getLetter(id: string): Letter | undefined {
  return letterById.get(id);
}
export function getLetterByChar(char: string): Letter | undefined {
  return letterByChar.get(char);
}
export function getSound(id: string): VowelledSound | undefined {
  return soundById.get(id);
}
/** Look up a vowelled sound by its exact written form, e.g. "كَ" or "مَا". */
export function getSoundByText(text: string): VowelledSound | undefined {
  return soundByText.get(text);
}
export function getSentence(id: string): Sentence | undefined {
  return sentenceById.get(id);
}
export function getStory(letterId: string): Story | undefined {
  return STORIES.find((s) => s.letterId === letterId);
}
export function instruction(id: string): Instruction {
  const found = instructionById.get(id);
  if (!found) throw new Error(`Unknown instruction "${id}"`);
  return found;
}
