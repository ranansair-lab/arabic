import { REMOTE_ENGINE_NAME } from './names';
import { resample } from './dsp';
import { encodeWav } from './wav';
import type { IncorrectReason, PronunciationResult, PronunciationService, PronunciationTarget, RecordedAudio } from './types';

/**
 * Adapter for a server-side phoneme-level assessment model.
 * Contract: docs/PRONUNCIATION.md → "Remote engine API".
 *
 *   POST {endpoint}  multipart/form-data
 *     audio   = 16 kHz mono WAV
 *     target  = JSON {id,text,phonemes,vowel,length,lengthMode}
 *   200 → {"status":"correct"|"incorrect"|"no_speech", "reason"?, "detected"?, "score"?}
 *
 * Any network error, timeout, non-200 or malformed body → "unavailable".
 */
export class RemotePronunciationEngine implements PronunciationService {
  readonly name = REMOTE_ENGINE_NAME;
  readonly verifies = ['consonant', 'vowel_quality', 'vowel_length'];

  constructor(
    private readonly endpoint: string,
    private readonly timeoutMs = 8000,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  async assess(audio: RecordedAudio, target: PronunciationTarget): Promise<PronunciationResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const form = new FormData();
      form.append('audio', encodeWav(resample(audio.samples, audio.sampleRate, 16000), 16000), 'attempt.wav');
      form.append('target', JSON.stringify(target));
      const res = await this.fetchImpl(this.endpoint, { method: 'POST', body: form, signal: controller.signal });
      if (!res.ok) return { status: 'unavailable', message: `HTTP ${res.status}` };
      return parseRemoteResult(await res.json(), this.verifies);
    } catch (err) {
      return { status: 'unavailable', message: err instanceof Error ? err.message : String(err) };
    } finally {
      clearTimeout(timer);
    }
  }
}

const REASONS: IncorrectReason[] = ['wrong_vowel', 'unclear', 'too_long', 'too_short', 'wrong_sound'];

export function parseRemoteResult(body: unknown, checks: string[]): PronunciationResult {
  if (!body || typeof body !== 'object') return { status: 'unavailable', message: 'Malformed response' };
  const b = body as Record<string, unknown>;
  const detected = typeof b.detected === 'string' ? b.detected : undefined;
  const score = typeof b.score === 'number' ? b.score : undefined;
  switch (b.status) {
    case 'correct':
      return { status: 'correct', detected, score, checks };
    case 'incorrect': {
      const reason = REASONS.includes(b.reason as IncorrectReason) ? (b.reason as IncorrectReason) : 'wrong_sound';
      return { status: 'incorrect', reason, detected, score, checks };
    }
    case 'no_speech':
      return { status: 'no_speech' };
    default:
      return { status: 'unavailable', message: 'Unknown status from assessment service' };
  }
}
