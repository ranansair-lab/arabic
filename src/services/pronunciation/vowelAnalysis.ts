import type { ShortVowel } from '../../curriculum/arabic';
import { VOWEL_ENGINE_CONFIG, type VowelEngineConfig } from './config';
import { bark, estimatePitch, formantsFromLpc, hamming, lpc, median, preEmphasis, removeDc, resample, rms } from './dsp';
import type { PronunciationResult, PronunciationTarget, RecordedAudio } from './types';

export interface VowelAnalysis {
  speech: boolean;
  /** Duration of the vowel nucleus in ms. */
  vowelMs: number;
  f0: number;
  f1: number;
  f2: number;
  z1: number;
  z2: number;
  /** Distance to each prototype (lower = closer). */
  distances: Record<ShortVowel, number>;
  vowel: ShortVowel | null;
  confidence: number;
}

const VOWELS: ShortVowel[] = ['fatha', 'kasra', 'damma'];

const EMPTY: VowelAnalysis = {
  speech: false,
  vowelMs: 0,
  f0: 0,
  f1: 0,
  f2: 0,
  z1: 0,
  z2: 0,
  distances: { fatha: Infinity, kasra: Infinity, damma: Infinity },
  vowel: null,
  confidence: 0,
};

/**
 * Finds the vowel nucleus of a single spoken syllable and measures its
 * quality (F1/F2 relative to F0) and duration.
 */
export function analyseVowel(audio: RecordedAudio, cfg: VowelEngineConfig = VOWEL_ENGINE_CONFIG): VowelAnalysis {
  if (!audio.samples.length) return EMPTY;
  const x = resample(removeDc(audio.samples), audio.sampleRate, cfg.analysisRate);
  const fs = cfg.analysisRate;
  const frameLen = Math.round((cfg.frameMs / 1000) * fs);
  const hop = Math.round((cfg.hopMs / 1000) * fs);
  const pitchLen = Math.round((cfg.pitchWindowMs / 1000) * fs);
  const nFrames = Math.max(0, Math.floor((x.length - pitchLen) / hop) + 1);
  if (nFrames < 3) return EMPTY;

  const energy: number[] = [];
  const pitch: { f0: number; clarity: number }[] = [];
  for (let i = 0; i < nFrames; i++) {
    const start = i * hop;
    energy.push(rms(x, start + (pitchLen - frameLen) / 2, start + (pitchLen + frameLen) / 2));
    pitch.push(estimatePitch(x.subarray(start, start + pitchLen), fs, cfg.minF0, cfg.maxF0));
  }
  const peak = Math.max(...energy);
  if (peak < cfg.silenceRms) return EMPTY;
  const sorted = energy.slice().sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.1)];
  const gate = Math.max(noiseFloor * 2.5, peak * 0.08);
  const voiced = energy.map((e, i) => e > gate && pitch[i].clarity >= cfg.voicingClarity && pitch[i].f0 > 0);

  // Longest voiced run, bridging gaps of up to 2 frames.
  let bestStart = -1;
  let bestEnd = -1;
  let runStart = -1;
  let lastVoiced = -10;
  for (let i = 0; i < nFrames; i++) {
    if (!voiced[i]) continue;
    if (i - lastVoiced > 3) runStart = i;
    lastVoiced = i;
    if (runStart >= 0 && i - runStart > bestEnd - bestStart) {
      bestStart = runStart;
      bestEnd = i;
    }
  }
  if (bestStart < 0) return EMPTY;

  // Vowel nucleus: loud part of the run (drops nasal/liquid murmur and tails).
  let runPeak = 0;
  for (let i = bestStart; i <= bestEnd; i++) if (voiced[i]) runPeak = Math.max(runPeak, energy[i]);
  const nucleus: number[] = [];
  for (let i = bestStart; i <= bestEnd; i++) if (voiced[i] && energy[i] >= runPeak * cfg.nucleusFraction) nucleus.push(i);
  if (!nucleus.length) return EMPTY;
  const vowelMs = (nucleus[nucleus.length - 1] - nucleus[0] + 1) * cfg.hopMs;

  // Steady-state frames: middle 60% of the nucleus, away from transitions.
  const lo = Math.floor(nucleus.length * 0.2);
  const hi = Math.max(lo + 1, Math.ceil(nucleus.length * 0.8));
  const steady = nucleus.slice(lo, hi);
  const f1s: number[] = [];
  const f2s: number[] = [];
  const f0s: number[] = [];
  for (const i of steady) {
    const start = i * hop + Math.round((pitchLen - frameLen) / 2);
    const frame = hamming(preEmphasis(x.subarray(start, start + frameLen)));
    const a = lpc(frame, cfg.lpcOrder);
    if (!a) continue;
    const formants = formantsFromLpc(a, fs);
    const f0 = pitch[i].f0;
    // F1 must lie clearly above F0.
    const cands = formants.filter((f) => f.freq > Math.max(180, f0 * 1.05));
    if (cands.length < 2) continue;
    f1s.push(cands[0].freq);
    f2s.push(cands[1].freq);
    f0s.push(f0);
  }
  if (!f1s.length) return { ...EMPTY, speech: true, vowelMs };

  const f0 = median(f0s);
  const f1 = median(f1s);
  const f2 = median(f2s);
  const z1 = bark(f1) - bark(f0);
  const z2 = bark(f2) - bark(f1);
  const distances = {} as Record<ShortVowel, number>;
  for (const v of VOWELS) {
    const p = cfg.prototypes[v];
    distances[v] = Math.hypot((z1 - p.z1) / cfg.scale.z1, (z2 - p.z2) / cfg.scale.z2);
  }
  const ranked = VOWELS.slice().sort((a, b) => distances[a] - distances[b]);
  const d1 = distances[ranked[0]];
  const d2 = distances[ranked[1]];
  const confidence = d1 + d2 > 0 ? (d2 - d1) / (d1 + d2) : 0;
  return { speech: true, vowelMs, f0, f1, f2, z1, z2, distances, vowel: ranked[0], confidence };
}

const LONG_LABEL: Record<ShortVowel, string> = { fatha: 'aa', kasra: 'ii', damma: 'uu' };
const SHORT_LABEL: Record<ShortVowel, string> = { fatha: 'a', kasra: 'i', damma: 'u' };

/** Turns an analysis into a verdict for the given target. Never optimistic. */
export function judgeVowel(analysis: VowelAnalysis, target: PronunciationTarget, cfg: VowelEngineConfig = VOWEL_ENGINE_CONFIG): PronunciationResult {
  const checks = ['vowel_quality', 'vowel_length'];
  if (!analysis.speech || analysis.vowelMs < cfg.minVowelMs) return { status: 'no_speech' };
  if (!analysis.vowel) return { status: 'incorrect', reason: 'unclear', checks };
  const isLong = analysis.vowelMs >= cfg.longMinMs;
  const detected = (isLong ? LONG_LABEL : SHORT_LABEL)[analysis.vowel];
  const score = Math.max(0, Math.min(1, 1 - analysis.distances[target.vowel] / 3));
  if (analysis.confidence < cfg.minConfidence) return { status: 'incorrect', reason: 'unclear', detected, score, checks };
  if (analysis.vowel !== target.vowel) return { status: 'incorrect', reason: 'wrong_vowel', detected, score, checks };
  if (target.lengthMode === 'short_lenient' && analysis.vowelMs > cfg.shortLenientMaxMs) {
    return { status: 'incorrect', reason: 'too_long', detected, score, checks };
  }
  if (target.lengthMode === 'short_strict' && analysis.vowelMs > cfg.shortStrictMaxMs) {
    return { status: 'incorrect', reason: 'too_long', detected, score, checks };
  }
  if (target.lengthMode === 'long' && analysis.vowelMs < cfg.longMinMs) {
    return { status: 'incorrect', reason: 'too_short', detected, score, checks };
  }
  return { status: 'correct', detected, score, checks };
}
