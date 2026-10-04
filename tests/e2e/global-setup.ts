import { mkdirSync, writeFileSync } from 'node:fs';
import { synthVowel, VOICES } from '../unit/synth';
import { encodeWavNode } from './wav-node';

/** Writes a looping /a/ WAV for the "real Chromium fake device" test. */
export default function globalSetup() {
  mkdirSync('test-results', { recursive: true });
  const fs = 48000;
  const v = VOICES.child;
  const syll = synthVowel({ f0: v.f0, formants: [...v.fatha] }, { durationMs: 280, nasalOnsetMs: 70, padMs: 600, sampleRate: fs });
  writeFileSync('test-results/fake-fatha.wav', encodeWavNode(syll, fs));
}
