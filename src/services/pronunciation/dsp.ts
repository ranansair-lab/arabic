/**
 * Small, dependency-free DSP toolkit for vowel analysis.
 * Pure functions on Float32Array/number[] so they run in the browser,
 * in a worker, or in Node unit tests.
 */

export function removeDc(x: Float32Array): Float32Array {
  let mean = 0;
  for (let i = 0; i < x.length; i++) mean += x[i];
  mean /= x.length || 1;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] - mean;
  return out;
}

/** Windowed-sinc low-pass FIR. */
function lowpassKernel(cutoffHz: number, sampleRate: number, taps = 101): Float32Array {
  const fc = cutoffHz / sampleRate;
  const m = taps - 1;
  const h = new Float32Array(taps);
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const n = i - m / 2;
    const sinc = n === 0 ? 2 * Math.PI * fc : Math.sin(2 * Math.PI * fc * n) / n;
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / m) + 0.08 * Math.cos((4 * Math.PI * i) / m); // Blackman
    h[i] = sinc * w;
    sum += h[i];
  }
  for (let i = 0; i < taps; i++) h[i] /= sum;
  return h;
}

/** Anti-aliased resampling (low-pass then linear interpolation). */
export function resample(x: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (Math.abs(fromRate - toRate) < 1) return x;
  let src = x;
  if (toRate < fromRate) {
    const h = lowpassKernel(0.45 * toRate, fromRate);
    const half = (h.length - 1) / 2;
    const filtered = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) {
      let acc = 0;
      for (let k = 0; k < h.length; k++) {
        const idx = i + k - half;
        if (idx >= 0 && idx < x.length) acc += x[idx] * h[k];
      }
      filtered[i] = acc;
    }
    src = filtered;
  }
  const ratio = fromRate / toRate;
  const outLen = Math.floor(src.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = src[i0] ?? 0;
    const b = src[i0 + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

export function rms(x: Float32Array, start = 0, end = x.length): number {
  let s = 0;
  for (let i = start; i < end; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, end - start));
}

export interface PitchEstimate {
  f0: number;
  /** Normalised autocorrelation peak, 0..1 (voicing strength). */
  clarity: number;
}

/** Normalised autocorrelation pitch estimate within [minF0, maxF0]. */
export function estimatePitch(frame: Float32Array, sampleRate: number, minF0 = 70, maxF0 = 650): PitchEstimate {
  const minLag = Math.floor(sampleRate / maxF0);
  const maxLag = Math.min(Math.ceil(sampleRate / minF0), frame.length - 2);
  if (maxLag <= minLag) return { f0: 0, clarity: 0 };
  const corr = new Float64Array(maxLag + 2);
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let num = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i + lag < frame.length; i++) {
      num += frame[i] * frame[i + lag];
      e1 += frame[i] * frame[i];
      e2 += frame[i + lag] * frame[i + lag];
    }
    corr[lag] = e1 > 0 && e2 > 0 ? num / Math.sqrt(e1 * e2) : 0;
  }
  // Pick the first strong peak (avoids octave errors to sub-harmonics).
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) if (corr[lag] > best) best = corr[lag];
  let bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (corr[lag] >= 0.9 * best && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      bestLag = lag;
      break;
    }
  }
  if (!bestLag) return { f0: 0, clarity: 0 };
  // Parabolic interpolation for sub-sample lag.
  const a = corr[bestLag - 1];
  const b = corr[bestLag];
  const c = corr[bestLag + 1];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
  return { f0: sampleRate / (bestLag + shift), clarity: b };
}

export function preEmphasis(x: Float32Array, coeff = 0.97): Float32Array {
  const out = new Float32Array(x.length);
  out[0] = x[0] ?? 0;
  for (let i = 1; i < x.length; i++) out[i] = x[i] - coeff * x[i - 1];
  return out;
}

export function hamming(x: Float32Array): Float32Array {
  const n = x.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = x[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
  return out;
}

/** LPC coefficients [1, a1..ap] via autocorrelation + Levinson–Durbin. */
export function lpc(frame: Float32Array, order: number): Float64Array | null {
  const r = new Float64Array(order + 1);
  for (let lag = 0; lag <= order; lag++) {
    let s = 0;
    for (let i = 0; i + lag < frame.length; i++) s += frame[i] * frame[i + lag];
    r[lag] = s;
  }
  if (r[0] <= 1e-12) return null;
  r[0] *= 1 + 1e-9; // tiny white-noise correction for stability
  const a = new Float64Array(order + 1);
  a[0] = 1;
  let err = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / err;
    const prev = a.slice();
    for (let j = 1; j < i; j++) a[j] = prev[j] + k * prev[i - j];
    a[i] = k;
    err *= 1 - k * k;
    if (err <= 0) return null;
  }
  return a;
}

/** Roots of z^p + c1 z^(p-1) + … + cp by Durand–Kerner iteration. */
export function polynomialRoots(coeffs: Float64Array): Array<[number, number]> {
  const p = coeffs.length - 1;
  const re = new Float64Array(p);
  const im = new Float64Array(p);
  for (let i = 0; i < p; i++) {
    const ang = (2 * Math.PI * i) / p + 0.4;
    re[i] = 0.9 * Math.cos(ang);
    im[i] = 0.9 * Math.sin(ang);
  }
  const evalPoly = (zr: number, zi: number): [number, number] => {
    let vr = 1;
    let vi = 0;
    for (let k = 1; k <= p; k++) {
      const nr = vr * zr - vi * zi + coeffs[k];
      const ni = vr * zi + vi * zr;
      vr = nr;
      vi = ni;
    }
    return [vr, vi];
  };
  for (let iter = 0; iter < 400; iter++) {
    let maxDelta = 0;
    for (let i = 0; i < p; i++) {
      const [nr, ni] = evalPoly(re[i], im[i]);
      let dr = 1;
      let di = 0;
      for (let j = 0; j < p; j++) {
        if (j === i) continue;
        const tr = re[i] - re[j];
        const ti = im[i] - im[j];
        const pr = dr * tr - di * ti;
        const pi = dr * ti + di * tr;
        dr = pr;
        di = pi;
      }
      const mag = dr * dr + di * di || 1e-30;
      const qr = (nr * dr + ni * di) / mag;
      const qi = (ni * dr - nr * di) / mag;
      re[i] -= qr;
      im[i] -= qi;
      maxDelta = Math.max(maxDelta, Math.abs(qr) + Math.abs(qi));
    }
    if (maxDelta < 1e-10) break;
  }
  return Array.from({ length: p }, (_, i) => [re[i], im[i]] as [number, number]);
}

export interface Formant {
  freq: number;
  bandwidth: number;
}

/** Formant candidates from an LPC polynomial, sorted by frequency. */
export function formantsFromLpc(a: Float64Array, sampleRate: number, maxBandwidth = 500): Formant[] {
  const roots = polynomialRoots(a);
  const out: Formant[] = [];
  for (const [r, i] of roots) {
    if (i <= 0) continue;
    const freq = (Math.atan2(i, r) * sampleRate) / (2 * Math.PI);
    const mag = Math.hypot(r, i);
    const bandwidth = (-Math.log(mag) * sampleRate) / Math.PI;
    if (freq > 150 && freq < sampleRate / 2 - 150 && bandwidth > 0 && bandwidth < maxBandwidth) out.push({ freq, bandwidth });
  }
  return out.sort((x, y) => x.freq - y.freq);
}

/** Traunmüller (1990) Hz → Bark. */
export function bark(f: number): number {
  return (26.81 * f) / (1960 + f) - 0.53;
}

export function median(values: number[]): number {
  if (!values.length) return NaN;
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
