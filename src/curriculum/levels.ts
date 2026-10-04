/**
 * Curriculum progression. Every level declares its prerequisite so advanced
 * features can never be taught before the skills they depend on.
 * Thresholds live here (not in UI components) so teachers can tune them.
 */
export type LevelId =
  | 'short_vowels'
  | 'long_vowels'
  | 'sentences'
  | 'mini_stories'
  | 'sukun'
  | 'shadda'
  | 'tanween'
  | 'lam_shamsiyya_qamariyya';

export interface LevelDefinition {
  id: LevelId;
  title: string;
  emoji: string;
  implemented: boolean;
  /** Human-readable unlock rule (teacher-facing). */
  unlockRule: string;
}

export const CURRICULUM_RULES = {
  /** Short-vowel letters needed before حُرُوفُ الْمَدِّ unlocks. */
  longVowelUnlockLetters: 8,
  /** Words built + analysed (distinct) before the sentence level unlocks. */
  sentenceUnlockWords: 5,
  /** Sentences read (with comprehension) before mini decodable stories unlock. */
  miniStoryUnlockSentences: 3,
  /** Long-vowel letters needed before السُّكُون would unlock (future level). */
  sukunUnlockLongLetters: 6,
} as const;

export const LEVELS: LevelDefinition[] = [
  { id: 'short_vowels', title: 'الْحَرَكَاتُ الْقَصِيرَةُ', emoji: '🔤', implemented: true, unlockRule: 'Always open' },
  { id: 'long_vowels', title: 'حُرُوفُ الْمَدِّ', emoji: '🎵', implemented: true, unlockRule: `${CURRICULUM_RULES.longVowelUnlockLetters} short-vowel letters mastered` },
  { id: 'sentences', title: 'جُمَلٌ', emoji: '📝', implemented: true, unlockRule: `${CURRICULUM_RULES.sentenceUnlockWords} different words built or analysed, and at least one decodable sentence` },
  { id: 'mini_stories', title: 'قِصَصٌ قَصِيرَةٌ', emoji: '📚', implemented: true, unlockRule: `${CURRICULUM_RULES.miniStoryUnlockSentences} sentences read` },
  { id: 'sukun', title: 'السُّكُونُ', emoji: '⭕', implemented: false, unlockRule: `Planned: after ${CURRICULUM_RULES.sukunUnlockLongLetters} long-vowel letters` },
  { id: 'shadda', title: 'الشَّدَّةُ', emoji: '✳️', implemented: false, unlockRule: 'Planned: after sukun' },
  { id: 'tanween', title: 'التَّنْوِينُ', emoji: '🔔', implemented: false, unlockRule: 'Planned: after sukun' },
  { id: 'lam_shamsiyya_qamariyya', title: 'اللَّامُ الشَّمْسِيَّةُ وَالْقَمَرِيَّةُ', emoji: '☀️🌙', implemented: false, unlockRule: 'Planned: after shadda and sukun' },
];
