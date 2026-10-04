import { VOICE_ENGINE_NAME } from './names';
import { analyseVowel, judgeVowel } from './vowelAnalysis';
import type { PronunciationResult, PronunciationService, PronunciationTarget, RecordedAudio } from './types';

/**
 * On-device engine. Verifies the VOWEL of a single syllable (فتحة/كسرة/ضمة,
 * via speaker-normalised formants) and its LENGTH (short vs madd).
 * It does not verify the consonant — use the remote engine for full phoneme
 * scoring (docs/PRONUNCIATION.md).
 */
export class LocalVowelEngine implements PronunciationService {
  readonly name = VOICE_ENGINE_NAME;
  readonly verifies = ['vowel_quality', 'vowel_length'];

  async assess(audio: RecordedAudio, target: PronunciationTarget): Promise<PronunciationResult> {
    if (target.id.startsWith('sentence:')) {
      return { status: 'unavailable', message: 'The on-device engine only assesses single syllables.' };
    }
    try {
      return judgeVowel(analyseVowel(audio), target);
    } catch (err) {
      return { status: 'unavailable', message: err instanceof Error ? err.message : String(err) };
    }
  }
}
