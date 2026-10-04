/**
 * Plays curriculum audio.
 *
 *  1. A validated native MSA recording listed in /audio/manifest.json  ← production
 *  2. Browser Arabic TTS — ONLY when VITE_ALLOW_DEV_TTS=true (development /
 *     preview builds), ONLY with an Arabic voice, never a foreign voice.
 *  3. Otherwise → AudioUnavailableError, and the UI shows a replay /
 *     "audio unavailable" state. Nothing is ever silently skipped.
 */
export interface AudioClip {
  /** Path relative to /audio without guaranteeing extension, e.g. "phonemes/meem_a.mp3". */
  audio: string;
  /** Exact vowelled Arabic text (used only by the development TTS fallback). */
  text: string;
}

export type AudioSource = 'recording' | 'dev-tts';

export class AudioUnavailableError extends Error {
  constructor(public readonly clip: AudioClip, reason: string) {
    super(`Audio unavailable for "${clip.audio}": ${reason}`);
  }
}

interface Manifest {
  files: Record<string, string>;
}

const stem = (path: string) => path.replace(/\.[a-z0-9]+$/i, '');

export class AudioService {
  private manifest: Manifest = { files: {} };
  private ready: Promise<void> | null = null;
  private current: HTMLAudioElement | null = null;
  private playToken = 0;
  private listeners = new Set<(src: AudioSource) => void>();

  constructor(
    private readonly baseUrl: string,
    private readonly allowDevTts: boolean,
  ) {}

  init(): Promise<void> {
    this.ready ??= fetch(`${this.baseUrl}audio/manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : { files: {} }))
      .then((m: Manifest) => {
        this.manifest = m && typeof m.files === 'object' ? m : { files: {} };
      })
      .catch(() => {
        this.manifest = { files: {} };
      });
    return this.ready;
  }

  get devTtsAllowed(): boolean {
    return this.allowDevTts;
  }

  hasRecording(clip: AudioClip | string): boolean {
    return stem(typeof clip === 'string' ? clip : clip.audio) in this.manifest.files;
  }

  recordedCount(): number {
    return Object.keys(this.manifest.files).length;
  }

  onSourceUsed(listener: (src: AudioSource) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  stop(): void {
    this.playToken++;
    if (this.current) {
      this.current.pause();
      this.current = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /** Resolves when playback ends. Rejects with AudioUnavailableError. */
  async play(clip: AudioClip): Promise<AudioSource> {
    await this.init();
    this.stop();
    const token = this.playToken;
    const file = this.manifest.files[stem(clip.audio)];
    if (file) {
      try {
        await this.playFile(`${this.baseUrl}audio/${file}`, token);
        this.emit('recording');
        return 'recording';
      } catch (err) {
        if (!this.allowDevTts) throw new AudioUnavailableError(clip, String(err));
      }
    }
    if (this.allowDevTts) {
      await this.speak(clip, token);
      this.emit('dev-tts');
      return 'dev-tts';
    }
    throw new AudioUnavailableError(clip, 'no validated recording yet');
  }

  /** Plays clips one after another; `onIndex` reports the clip being played. */
  async playSequence(clips: AudioClip[], onIndex?: (i: number) => void): Promise<void> {
    for (let i = 0; i < clips.length; i++) {
      const token = this.playToken;
      onIndex?.(i);
      await this.play(clips[i]);
      if (this.playToken !== token + 1) return; // interrupted by another play/stop
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  private emit(src: AudioSource) {
    this.listeners.forEach((l) => l(src));
  }

  private playFile(url: string, token: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const el = new Audio(url);
      this.current = el;
      el.onended = () => resolve();
      el.onerror = () => reject(new Error('decode/network error'));
      el.play().catch(reject);
      const check = setInterval(() => {
        if (this.playToken !== token) {
          clearInterval(check);
          resolve();
        }
      }, 200);
      el.addEventListener('ended', () => clearInterval(check));
      el.addEventListener('error', () => clearInterval(check));
    });
  }

  private async arabicVoice(): Promise<SpeechSynthesisVoice | null> {
    if (typeof speechSynthesis === 'undefined') return null;
    let voices = speechSynthesis.getVoices();
    if (!voices.length) {
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 1200);
        speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); resolve(); }, { once: true });
      });
      voices = speechSynthesis.getVoices();
    }
    // Arabic voices only — never let a foreign voice attempt Arabic.
    const arabic = voices.filter((v) => v.lang.toLowerCase().startsWith('ar'));
    return arabic.find((v) => /sa|ae/i.test(v.lang)) ?? arabic[0] ?? null;
  }

  private async speak(clip: AudioClip, token: number): Promise<void> {
    const voice = await this.arabicVoice();
    if (!voice) throw new AudioUnavailableError(clip, 'no recording and no Arabic TTS voice on this device');
    if (this.playToken !== token) return;
    await new Promise<void>((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(clip.text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.7;
      u.onend = () => resolve();
      u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new AudioUnavailableError(clip, e.error)));
      speechSynthesis.speak(u);
    });
  }
}

export const audioService = new AudioService(
  import.meta.env.BASE_URL,
  import.meta.env.VITE_ALLOW_DEV_TTS === 'true',
);
