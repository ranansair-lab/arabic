import type { ShortVowel, VowelLength } from './arabic';

/** A vowelled letter sound such as مَ (short) or مَا (long). */
export interface VowelledSound {
  /** Stable id, also the audio file stem: e.g. "meem_a", "meem_aa". */
  id: string;
  letterId: string;
  /** Always fully vowelled — shown to the child exactly like this. */
  text: string;
  vowel: ShortVowel;
  length: VowelLength;
  /** Phonemic transliteration used by the pronunciation service, e.g. "ma", "maa". */
  phonemes: string;
  /** Relative to /audio, e.g. "phonemes/meem_a.mp3". */
  audio: string;
}

export interface Letter {
  id: string;
  /** Glyph shown on the home screen, e.g. "م". */
  char: string;
  /** Vowelled letter name, e.g. "مِيم" (for teacher-facing text only). */
  name: string;
  /** Consonant transliteration, e.g. "m". */
  consonant: string;
  /** Short-vowel forms in teaching order: fatha, kasra, damma. */
  forms: VowelledSound[];
  /** Long-vowel forms (Level 2) in the same order: aa, ii, uu. */
  longForms: VowelledSound[];
}

export interface DecodableWord {
  id: string;
  /** Fully vowelled word, e.g. "كَتَبَ". */
  word: string;
  /** Vowelled segments, e.g. ["كَ","تَ","بَ"]. */
  segments: string[];
  /** Base letters (home-screen glyphs) the child must have mastered. */
  requiredLetters: string[];
  /** 1 = short vowels only; 2 = contains long vowels (حروف المد). */
  level: 1 | 2;
  translit: string;
  /** Teacher/parent gloss in English. */
  gloss: string;
  emoji?: string;
  audio: string;
}

export interface Story {
  letter: string;
  letterId: string;
  title: string;
  /** Exactly three short sentences. */
  sentences: string[];
  audio: string;
  /** Optional per-sentence recordings, same order as `sentences`. */
  sentenceAudio: string[];
}

export interface PictureChoice {
  emoji: string;
  /** Teacher-facing English label (also used as accessible name). */
  label: string;
}

export interface Sentence {
  id: string;
  text: string;
  words: string[];
  requiredLetters: string[];
  level: 1 | 2;
  picture: PictureChoice;
  distractors: PictureChoice[];
  audio: string;
  gloss: string;
}

export interface MiniStory {
  id: string;
  title: string;
  /** Ids of decodable sentences, read one per screen. */
  sentenceIds: string[];
  requiredLetters: string[];
  emoji: string;
}

export interface Instruction {
  id: string;
  text: string;
  audio: string;
}

export interface PronunciationAttempt {
  targetId: string;
  targetText: string;
  at: string;
  outcome: 'correct' | 'incorrect' | 'no_speech' | 'unavailable' | 'practice';
  detected?: string;
  engine: string;
}
