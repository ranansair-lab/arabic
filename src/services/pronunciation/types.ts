import type { ShortVowel, VowelLength } from '../../curriculum/arabic';

export interface RecordedAudio {
  /** Mono PCM in [-1, 1]. */
  samples: Float32Array;
  sampleRate: number;
  durationMs: number;
}

/** How strictly vowel length is judged for this target. */
export type LengthMode =
  /** Level 1: short target; only reject a clearly over-stretched vowel. */
  | 'short_lenient'
  /** Level 2 contrast: a short target must really be short. */
  | 'short_strict'
  /** Level 2: long target must be clearly lengthened. */
  | 'long';

export interface PronunciationTarget {
  id: string;
  /** Vowelled text shown to the child, e.g. "مَ". */
  text: string;
  /** Phonemic target, e.g. "ma", "maa". */
  phonemes: string;
  vowel: ShortVowel;
  length: VowelLength;
  lengthMode: LengthMode;
}

export type IncorrectReason = 'wrong_vowel' | 'unclear' | 'too_long' | 'too_short' | 'wrong_sound';

export type PronunciationResult =
  | { status: 'correct'; detected?: string; score?: number; checks: string[] }
  | { status: 'incorrect'; reason: IncorrectReason; detected?: string; score?: number; checks: string[] }
  /** Nothing usable was heard (silence, too short, too noisy). */
  | { status: 'no_speech' }
  /** The assessment service itself failed — NEVER treated as correct. */
  | { status: 'unavailable'; message: string };

export interface PronunciationService {
  readonly name: string;
  /** What this engine actually verifies, for honest teacher-facing reporting. */
  readonly verifies: string[];
  assess(audio: RecordedAudio, target: PronunciationTarget): Promise<PronunciationResult>;
}
