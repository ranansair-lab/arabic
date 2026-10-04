/**
 * Formant (source–filter) vowel synthesiser used to test the vowel engine with
 * known ground truth: adult male, adult female and child voices.
 */
export interface VoiceSpec {
  f0: number;
  formants: number[];
  bandwidths?: number[];
}

export interface SynthOptions {
  durationMs: number;
  sampleRate?: number;
  /** Voiced nasal murmur before the vowel (like the م of مَ), ms. */
  nasalOnsetMs?: number;
  /** Unvoiced fricative noise before the vowel (like the س of سَ), ms. */
  fricativeOnsetMs?: number;
  padMs?: number;
  noise?: number;
  seed?: number;
}

function rngFrom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

function resonate(x: Float32Array, freq: number, bw: number, fs: number): Float32Array {
  const r = Math.exp((-Math.PI * bw) / fs);
  const c = -r * r;
  const b = 2 * r * Math.cos((2 * Math.PI * freq) / fs);
  const a = 1 - b - c;
  const y = new Float32Array(x.length);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = a * x[i] + b * y1 + c * y2;
    y[i] = v; y2 = y1; y1 = v;
  }
  return y;
}

function glottalSource(n: number, f0: number, fs: number, rnd: () => number): Float32Array {
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const jitter = 1 + 0.01 * rnd();
    // slight natural F0 declination
    const f = f0 * (1 - 0.08 * (i / n)) * jitter;
    phase += f / fs;
    if (phase >= 1) phase -= 1;
    // Rosenberg-like pulse: open phase 0..0.6, closed after.
    const t = phase;
    out[i] = t < 0.4 ? 0.5 * (1 - Math.cos(Math.PI * t / 0.4)) : t < 0.6 ? Math.cos((Math.PI * (t - 0.4)) / 0.4) : 0;
  }
  // differentiate (radiation) for a realistic spectral tilt
  for (let i = n - 1; i > 0; i--) out[i] = out[i] - out[i - 1];
  return out;
}

export function synthVowel(voice: VoiceSpec, opts: SynthOptions): Float32Array {
  const fs = opts.sampleRate ?? 48000;
  const rnd = rngFrom(opts.seed ?? 7);
  const pad = Math.round(((opts.padMs ?? 250) / 1000) * fs);
  const nasal = Math.round(((opts.nasalOnsetMs ?? 0) / 1000) * fs);
  const fric = Math.round(((opts.fricativeOnsetMs ?? 0) / 1000) * fs);
  const vowelN = Math.round((opts.durationMs / 1000) * fs);
  const bws = voice.bandwidths ?? [80, 100, 150, 200, 250];

  const src = glottalSource(vowelN + nasal, voice.f0, fs, rnd);
  let v = src.subarray(nasal);
  let vowel = new Float32Array(v);
  voice.formants.forEach((f, k) => { vowel = resonate(vowel, f, bws[k] ?? 200, fs); });

  let murmur = new Float32Array(src.subarray(0, nasal));
  if (nasal) {
    murmur = resonate(murmur, 260, 60, fs);
    murmur = resonate(murmur, 1100, 300, fs);
  }
  const total = pad + fric + nasal + vowelN + pad;
  const out = new Float32Array(total);
  const norm = (arr: Float32Array) => { let m = 0; for (const s of arr) m = Math.max(m, Math.abs(s)); return m || 1; };
  const vNorm = norm(vowel);
  const ramp = Math.round(0.02 * fs);
  for (let i = 0; i < vowelN; i++) {
    const env = Math.min(1, i / ramp, (vowelN - i) / ramp);
    out[pad + fric + nasal + i] = (0.5 * vowel[i] / vNorm) * env;
  }
  if (nasal) {
    const mNorm = norm(murmur);
    for (let i = 0; i < nasal; i++) out[pad + fric + i] = (0.12 * murmur[i] / mNorm) * Math.min(1, i / ramp);
  }
  for (let i = 0; i < fric; i++) out[pad + i] = 0.08 * rnd();
  const noise = opts.noise ?? 0.002;
  for (let i = 0; i < total; i++) out[i] += noise * rnd();
  return out;
}

/** Representative formants (Hz). Arabic fatha is fronted in plain contexts. */
export const VOICES = {
  man: {
    f0: 120,
    fatha: [700, 1450, 2550, 3500], fathaBack: [720, 1100, 2450, 3400],
    kasra: [290, 2250, 2950, 3500], damma: [330, 850, 2350, 3300],
  },
  woman: {
    f0: 210,
    fatha: [850, 1650, 2850, 4000], fathaBack: [850, 1250, 2800, 3900],
    kasra: [320, 2750, 3300, 4200], damma: [380, 950, 2700, 3800],
  },
  child: {
    f0: 280,
    fatha: [1050, 1850, 3300, 4300], fathaBack: [1000, 1450, 3200, 4200],
    kasra: [400, 3100, 3700, 4500], damma: [460, 1150, 3200, 4200],
  },
  youngChild: {
    f0: 330,
    fatha: [1100, 1950, 3500, 4500], fathaBack: [1050, 1500, 3400, 4400],
    kasra: [430, 3250, 3900, 4600], damma: [490, 1200, 3300, 4300],
  },
} as const;
