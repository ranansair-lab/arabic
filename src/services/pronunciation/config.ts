/**
 * Tunable thresholds for the on-device vowel engine. Calibrate these with real
 * FS2 recordings before release (see docs/PRONUNCIATION.md → "Calibration").
 */
export const VOWEL_ENGINE_CONFIG = {
  analysisRate: 12000,
  frameMs: 25,
  hopMs: 10,
  pitchWindowMs: 40,
  lpcOrder: 12,
  minF0: 70,
  maxF0: 650,
  /** Minimum normalised autocorrelation for a frame to count as voiced. */
  voicingClarity: 0.5,
  /** Peak RMS below this is treated as silence (≈ −46 dBFS). */
  silenceRms: 0.005,
  /** Vowel nucleus = frames ≥ this fraction of the loudest voiced frame. */
  nucleusFraction: 0.3,
  /** Shortest vowel nucleus accepted as speech. */
  minVowelMs: 70,
  /** Level 1: reject only clearly stretched short vowels. */
  shortLenientMaxMs: 700,
  /** Level 2 contrast drills: a short vowel must be at most this long. */
  shortStrictMaxMs: 360,
  /** Level 2: a long vowel must be at least this long. */
  longMinMs: 420,
  /**
   * Vowel prototypes in speaker-normalised Bark-difference space
   * (Syrdal & Gopal 1986): z1 = B(F1) − B(F0) (height), z2 = B(F2) − B(F1) (backness).
   * These are largely independent of speaker size, so adult, child and
   * teacher voices share one prototype set.
   */
  prototypes: {
    fatha: { z1: 5.2, z2: 3.4 },
    kasra: { z1: 1.4, z2: 11.4 },
    damma: { z1: 1.7, z2: 4.6 },
  },
  /** Distance scale per dimension. */
  scale: { z1: 1.4, z2: 2.4 },
  /** Required relative margin between best and second-best vowel. */
  minConfidence: 0.12,
} as const;

export type VowelEngineConfig = typeof VOWEL_ENGINE_CONFIG;
