import { describe, expect, it } from 'vitest';
import { analyseVowel, judgeVowel } from '../../src/services/pronunciation/vowelAnalysis';
import { LocalVowelEngine } from '../../src/services/pronunciation/localEngine';
import type { PronunciationTarget } from '../../src/services/pronunciation/types';
import { synthVowel, VOICES } from './synth';

const FS = 48000;
const rec = (samples: Float32Array) => ({ samples, sampleRate: FS, durationMs: (samples.length / FS) * 1000 });
type V = 'fatha' | 'kasra' | 'damma';
const target = (vowel: V, lengthMode: PronunciationTarget['lengthMode'] = 'short_lenient'): PronunciationTarget => ({
  id: 'meem_' + vowel, text: 'م', phonemes: 'm' + vowel[0], vowel, length: lengthMode === 'long' ? 'long' : 'short', lengthMode,
});

const voiceNames = Object.keys(VOICES) as (keyof typeof VOICES)[];
const qualities: Array<[V, 'fatha' | 'fathaBack' | 'kasra' | 'damma']> = [
  ['fatha', 'fatha'], ['fatha', 'fathaBack'], ['kasra', 'kasra'], ['damma', 'damma'],
];

describe('vowel engine distinguishes فتحة / كسرة / ضمة', () => {
  for (const voice of voiceNames) {
    for (const [vowel, table] of qualities) {
      for (const onset of ['none', 'nasal', 'fricative'] as const) {
        it(`${voice} ${table} (${onset} onset) → ${vowel}`, () => {
          const v = VOICES[voice];
          const s = synthVowel({ f0: v.f0, formants: [...v[table]] }, {
            durationMs: 260, nasalOnsetMs: onset === 'nasal' ? 80 : 0, fricativeOnsetMs: onset === 'fricative' ? 90 : 0, seed: 11,
          });
          const a = analyseVowel(rec(s));
          expect(a.vowel).toBe(vowel);
          expect(a.confidence).toBeGreaterThan(0.3);
        });
      }
    }
  }
});

describe('verdicts are exact — مَ ≠ مِ ≠ مُ', () => {
  const v = VOICES.child;
  const said = { fatha: v.fatha, kasra: v.kasra, damma: v.damma } as const;
  for (const spoken of ['fatha', 'kasra', 'damma'] as const) {
    for (const wanted of ['fatha', 'kasra', 'damma'] as const) {
      it(`child says ${spoken}, target ${wanted}`, () => {
        const s = synthVowel({ f0: v.f0, formants: [...said[spoken]] }, { durationMs: 250, nasalOnsetMs: 70 });
        const r = judgeVowel(analyseVowel(rec(s)), target(wanted));
        if (spoken === wanted) expect(r.status).toBe('correct');
        else expect(r).toMatchObject({ status: 'incorrect', reason: 'wrong_vowel' });
      });
    }
  }
});

describe('short vs long (Level 2)', () => {
  const v = VOICES.woman;
  it('long target accepts a long vowel', () => {
    const s = synthVowel({ f0: v.f0, formants: [...v.fatha] }, { durationMs: 650 });
    expect(judgeVowel(analyseVowel(rec(s)), target('fatha', 'long')).status).toBe('correct');
  });
  it('long target rejects a short vowel as too_short', () => {
    const s = synthVowel({ f0: v.f0, formants: [...v.fatha] }, { durationMs: 200 });
    expect(judgeVowel(analyseVowel(rec(s)), target('fatha', 'long'))).toMatchObject({ status: 'incorrect', reason: 'too_short' });
  });
  it('strict short target rejects a long vowel as too_long', () => {
    const s = synthVowel({ f0: v.f0, formants: [...v.kasra] }, { durationMs: 650 });
    expect(judgeVowel(analyseVowel(rec(s)), target('kasra', 'short_strict'))).toMatchObject({ status: 'incorrect', reason: 'too_long' });
  });
  it('strict short target accepts a short vowel', () => {
    const s = synthVowel({ f0: v.f0, formants: [...v.kasra] }, { durationMs: 200 });
    expect(judgeVowel(analyseVowel(rec(s)), target('kasra', 'short_strict')).status).toBe('correct');
  });
  it('long vowel with the wrong quality is still wrong', () => {
    const s = synthVowel({ f0: v.f0, formants: [...v.damma] }, { durationMs: 650 });
    expect(judgeVowel(analyseVowel(rec(s)), target('fatha', 'long'))).toMatchObject({ status: 'incorrect', reason: 'wrong_vowel' });
  });
});

describe('never fakes success', () => {
  it('silence → no_speech', () => {
    const s = new Float32Array(FS);
    for (let i = 0; i < s.length; i++) s[i] = (Math.random() - 0.5) * 0.001;
    expect(judgeVowel(analyseVowel(rec(s)), target('fatha')).status).toBe('no_speech');
  });
  it('white noise only → not correct', () => {
    const s = new Float32Array(FS);
    for (let i = 0; i < s.length; i++) s[i] = (Math.random() - 0.5) * 0.4;
    expect(judgeVowel(analyseVowel(rec(s)), target('fatha')).status).not.toBe('correct');
  });
  it('empty recording → no_speech', () => {
    expect(judgeVowel(analyseVowel(rec(new Float32Array(0))), target('fatha')).status).toBe('no_speech');
  });
  it('a click / very short blip → no_speech', () => {
    const v = VOICES.man;
    const s = synthVowel({ f0: v.f0, formants: [...v.fatha] }, { durationMs: 40 });
    expect(judgeVowel(analyseVowel(rec(s)), target('fatha')).status).toBe('no_speech');
  });
  it('engine errors become "unavailable", never "correct"', async () => {
    const engine = new LocalVowelEngine();
    const bad = { samples: null as unknown as Float32Array, sampleRate: FS, durationMs: 0 };
    const r = await engine.assess(bad, target('fatha'));
    expect(r.status).toBe('unavailable');
  });
  it('sentence targets are not judged by the syllable engine', async () => {
    const engine = new LocalVowelEngine();
    const v = VOICES.man;
    const s = synthVowel({ f0: v.f0, formants: [...v.fatha] }, { durationMs: 250 });
    const r = await engine.assess(rec(s), { ...target('fatha'), phonemes: 'huwa kataba', id: 'sentence:s01' });
    expect(r.status).toBe('unavailable');
  });
});

describe('works across microphone sample rates', () => {
  for (const sr of [16000, 22050, 44100, 48000]) {
    it(`${sr} Hz`, () => {
      const v = VOICES.child;
      const s = synthVowel({ f0: v.f0, formants: [...v.kasra] }, { durationMs: 250, sampleRate: sr });
      expect(analyseVowel({ samples: s, sampleRate: sr, durationMs: 0 }).vowel).toBe('kasra');
    });
  }
});
