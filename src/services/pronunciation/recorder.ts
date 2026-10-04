import type { RecordedAudio } from './types';

export type MicErrorKind = 'denied' | 'no_device' | 'unsupported' | 'insecure' | 'unknown';

export class MicError extends Error {
  constructor(public readonly kind: MicErrorKind, message: string) {
    super(message);
  }
}

function toMicError(err: unknown): MicError {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return new MicError('denied', 'Microphone permission denied');
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return new MicError('no_device', 'No microphone found');
  return new MicError('unknown', err instanceof Error ? err.message : String(err));
}

/**
 * Keeps the microphone open while a recording screen is visible so that
 * press-and-hold starts capturing instantly. Captures raw PCM (no codec), which
 * is what the assessment engines need.
 */
export class HoldRecorder {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sink: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private recording = false;
  private startedAt = 0;

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== 'undefined';
  }

  async open(): Promise<void> {
    if (this.stream) return;
    if (!globalThis.isSecureContext) throw new MicError('insecure', 'Microphone needs HTTPS');
    if (!HoldRecorder.isSupported()) throw new MicError('unsupported', 'Recording not supported in this browser');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      throw toMicError(err);
    }
    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(2048, 1, 1);
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.processor.onaudioprocess = (e) => {
      if (this.recording) this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(this.ctx.destination);
  }

  get isOpen(): boolean {
    return !!this.stream;
  }

  async start(): Promise<void> {
    await this.open();
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
    this.chunks = [];
    this.recording = true;
    this.startedAt = performance.now();
  }

  /** Stops capturing and returns what was recorded. */
  async stop(): Promise<RecordedAudio> {
    // Let the last audio buffer arrive.
    await new Promise((r) => setTimeout(r, 120));
    this.recording = false;
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(total);
    let off = 0;
    for (const c of this.chunks) {
      samples.set(c, off);
      off += c.length;
    }
    this.chunks = [];
    return { samples, sampleRate: this.ctx?.sampleRate ?? 48000, durationMs: performance.now() - this.startedAt };
  }

  get isRecording(): boolean {
    return this.recording;
  }

  close(): void {
    this.recording = false;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.sink?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => undefined);
    this.stream = null;
    this.ctx = null;
    this.source = null;
    this.processor = null;
    this.sink = null;
  }
}
