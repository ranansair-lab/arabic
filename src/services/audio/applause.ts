/**
 * Clapping for the reward moments. Plays a recorded clip when one is installed
 * at public/audio/effects/applause.*; otherwise it synthesises a short round of
 * applause with Web Audio, so the reward works offline and with no audio files.
 * Never throws: a missing sound must not interrupt the child.
 */
import { audioService } from './audioService';

const CLIP = { audio: 'effects/applause.mp3', text: '' };
let ctx: AudioContext | null = null;

/** Many hands clapping at slightly different speeds, fading out. */
export function synthApplause(sampleRate: number, seconds = 2.4, rng: () => number = Math.random): Float32Array {
  const out = new Float32Array(Math.floor(sampleRate * seconds));
  const clap = Math.floor(sampleRate * 0.03);
  for (let hand = 0; hand < 14; hand++) {
    const period = 0.17 + rng() * 0.1;
    const gain = 0.35 + rng() * 0.4;
    for (let t = rng() * period; t < seconds - 0.05; t += period * (0.9 + rng() * 0.2)) {
      const start = Math.floor(t * sampleRate);
      const fade = Math.min(1, (seconds - t) / 0.9);
      let prev = 0;
      for (let i = 0; i < clap && start + i < out.length; i++) {
        // High-passed noise burst with a fast decay ≈ one hand clap.
        const white = rng() * 2 - 1;
        const hp = white - prev * 0.85;
        prev = white;
        out[start + i] += hp * Math.exp(-i / (clap / 5)) * gain * fade;
      }
    }
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] = (out[i] / peak) * 0.6;
  return out;
}

export async function playApplause(): Promise<void> {
  try {
    await audioService.init();
    if (audioService.hasRecording(CLIP)) {
      await audioService.playEffect(CLIP);
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') await ctx.resume();
    const samples = synthApplause(ctx.sampleRate);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  } catch {
    /* the celebration is still visible */
  }
}
