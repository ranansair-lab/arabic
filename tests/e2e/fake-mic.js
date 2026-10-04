// Injected before the app loads. Replaces getUserMedia with a stream the test
// controls: silence by default, and window.__fakeMic.say(vowel, ms) "speaks" a
// synthetic child vowel (with a nasal onset like م) into the microphone.
(() => {
  const VOICE = {
    f0: 280,
    fatha: [1050, 1850, 3300, 4300],
    kasra: [400, 3100, 3700, 4500],
    damma: [460, 1150, 3200, 4200],
  };
  function resonate(x, freq, bw, fs) {
    const r = Math.exp((-Math.PI * bw) / fs), c = -r * r, b = 2 * r * Math.cos((2 * Math.PI * freq) / fs), a = 1 - b - c;
    const y = new Float32Array(x.length); let y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = a * x[i] + b * y1 + c * y2; y[i] = v; y2 = y1; y1 = v; }
    return y;
  }
  function synth(vowel, ms, fs) {
    const nasalN = Math.round(0.07 * fs), n = Math.round((ms / 1000) * fs), total = nasalN + n;
    const src = new Float32Array(total); let ph = 0;
    for (let i = 0; i < total; i++) {
      ph += (VOICE.f0 * (1 - 0.08 * i / total)) / fs; if (ph >= 1) ph -= 1;
      src[i] = ph < 0.4 ? 0.5 * (1 - Math.cos(Math.PI * ph / 0.4)) : ph < 0.6 ? Math.cos(Math.PI * (ph - 0.4) / 0.4) : 0;
    }
    for (let i = total - 1; i > 0; i--) src[i] -= src[i - 1];
    let v = src.slice(nasalN); VOICE[vowel].forEach((f, k) => { v = resonate(v, f, [80, 100, 150, 200][k], fs); });
    let m = resonate(src.slice(0, nasalN), 260, 60, fs);
    const out = new Float32Array(total), ramp = Math.round(0.02 * fs);
    const peak = (arr) => arr.reduce((p, s) => Math.max(p, Math.abs(s)), 0) || 1;
    const pv = peak(v), pm = peak(m);
    for (let i = 0; i < nasalN; i++) out[i] = 0.12 * m[i] / pm * Math.min(1, i / ramp);
    for (let i = 0; i < n; i++) out[nasalN + i] = 0.5 * v[i] / pv * Math.min(1, i / ramp, (n - i) / ramp);
    return out;
  }
  const state = { denied: false, ctx: null, dest: null, calls: 0 };
  window.__fakeMic = {
    deny() { state.denied = true; },
    allow() { state.denied = false; },
    calls: () => state.calls,
    say(vowel, ms = 260) {
      if (!state.ctx) return false;
      const fs = state.ctx.sampleRate;
      const data = synth(vowel, ms, fs);
      const buf = state.ctx.createBuffer(1, data.length, fs);
      buf.copyToChannel(data, 0);
      const node = state.ctx.createBufferSource();
      node.buffer = buf; node.connect(state.dest); node.start();
      return true;
    },
  };
  const md = navigator.mediaDevices || (navigator.mediaDevices = {});
  md.getUserMedia = async () => {
    state.calls++;
    if (state.denied) throw new DOMException('Permission denied', 'NotAllowedError');
    if (!state.ctx) {
      state.ctx = new AudioContext();
      state.dest = state.ctx.createMediaStreamDestination();
      // keep a near-silent noise floor running so the stream is "live"
      const noise = state.ctx.createBuffer(1, state.ctx.sampleRate, state.ctx.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() - 0.5) * 0.002;
      const ns = state.ctx.createBufferSource(); ns.buffer = noise; ns.loop = true; ns.connect(state.dest); ns.start();
    }
    await state.ctx.resume();
    // Like a real browser: a fresh track per getUserMedia call.
    return new MediaStream(state.dest.stream.getAudioTracks().map((t) => t.clone()));
  };
})();
