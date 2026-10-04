import { useEffect, useRef, useState } from 'react';
import { instruction } from '../../curriculum/content';
import { getPronunciationService, type PronunciationResult, type PronunciationTarget, type RecordedAudio } from '../../services/pronunciation';
import { HoldRecorder, MicError, type MicErrorKind } from '../../services/pronunciation/recorder';
import { encodeWav } from '../../services/pronunciation/wav';
import type { AudioClip } from '../../services/audio/audioService';
import { progressStore } from '../hooks';
import { ArabicText } from './ArabicText';
import { Feedback } from './Feedback';
import { Instruction, Speaker } from './Speaker';

type Phase =
  | { kind: 'opening' }
  | { kind: 'mic_error'; error: MicErrorKind }
  | { kind: 'ready'; hint?: 'hold_longer' }
  | { kind: 'recording' }
  | { kind: 'assessing' }
  | { kind: 'result'; result: PronunciationResult }
  | { kind: 'practiced' };

interface Props {
  target: PronunciationTarget;
  /** Model audio the child can listen to before recording. */
  clip: AudioClip;
  /** 'assess' = real scoring (syllables). 'practice' = record & listen back, never scored. */
  mode?: 'assess' | 'practice';
  onCorrect: () => void;
  /** Practice mode only: called once the child has recorded at least once. */
  onPracticed?: () => void;
  targetSize?: 'xl' | 'l' | 'm';
}

const MIN_HOLD_MS = 350;
const MAX_HOLD_MS = 6000;

export function PronunciationStep({ target, clip, mode = 'assess', onCorrect, onPracticed, targetSize = 'xl' }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'opening' });
  const [lastRecording, setLastRecording] = useState<RecordedAudio | null>(null);
  const recorder = useRef<HoldRecorder | null>(null);
  const holding = useRef(false);
  const pressedAt = useRef(0);
  const startPromise = useRef<Promise<void> | null>(null);
  const maxTimer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);

  const openMic = async () => {
    setPhase({ kind: 'opening' });
    try {
      recorder.current ??= new HoldRecorder();
      await recorder.current.open();
      if (mounted.current) setPhase({ kind: 'ready' });
    } catch (err) {
      if (mounted.current) setPhase({ kind: 'mic_error', error: err instanceof MicError ? err.kind : 'unknown' });
    }
  };

  useEffect(() => {
    mounted.current = true;
    void openMic();
    return () => {
      mounted.current = false;
      clearTimeout(maxTimer.current);
      recorder.current?.close();
      recorder.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New target (e.g. retry on a different form) → reset to ready.
  useEffect(() => {
    setPhase((p) => (p.kind === 'result' || p.kind === 'practiced' ? { kind: 'ready' } : p));
    setLastRecording(null);
  }, [target.id]);

  const canRecord = phase.kind === 'ready' || (phase.kind === 'result' && phase.result.status !== 'correct') || phase.kind === 'practiced';

  const begin = () => {
    if (!canRecord || holding.current || !recorder.current) return;
    holding.current = true;
    pressedAt.current = performance.now();
    setPhase({ kind: 'recording' });
    startPromise.current = recorder.current.start();
    maxTimer.current = window.setTimeout(() => void finish(), MAX_HOLD_MS);
  };

  const finish = async () => {
    if (!holding.current || !recorder.current) return;
    holding.current = false;
    clearTimeout(maxTimer.current);
    try {
      await startPromise.current;
    } catch {
      setPhase({ kind: 'mic_error', error: 'unknown' });
      return;
    }
    const audio = await recorder.current.stop();
    if (!mounted.current) return;
    if (performance.now() - pressedAt.current < MIN_HOLD_MS) {
      setPhase({ kind: 'ready', hint: 'hold_longer' });
      return;
    }
    setLastRecording(audio);
    if (mode === 'practice') {
      progressStore.recordPronunciation({ targetId: target.id, targetText: target.text, at: new Date().toISOString(), outcome: 'practice', engine: 'none' });
      setPhase({ kind: 'practiced' });
      onPracticed?.();
      return;
    }
    setPhase({ kind: 'assessing' });
    const service = getPronunciationService();
    let result: PronunciationResult;
    try {
      result = await service.assess(audio, target);
    } catch (err) {
      result = { status: 'unavailable', message: String(err) };
    }
    if (!mounted.current) return;
    progressStore.recordPronunciation({
      targetId: target.id,
      targetText: target.text,
      at: new Date().toISOString(),
      outcome: result.status,
      detected: 'detected' in result ? result.detected : undefined,
      engine: service.name,
    });
    setPhase({ kind: 'result', result });
  };

  const playBack = () => {
    if (!lastRecording) return;
    const url = URL.createObjectURL(encodeWav(lastRecording.samples, lastRecording.sampleRate));
    const el = new Audio(url);
    el.onended = () => URL.revokeObjectURL(url);
    void el.play().catch(() => URL.revokeObjectURL(url));
  };

  const result = phase.kind === 'result' ? phase.result : null;
  const isRetry = (result && result.status !== 'correct') || phase.kind === 'practiced';

  return (
    <section className="center" data-testid="step-pronounce" data-target={target.text}>
      <Instruction id="hold_and_say" icon="👆" />
      <div className="card center" style={{ width: '100%', padding: '4px 12px' }}>
        <ArabicText text={target.text} size={targetSize} testId="pronounce-target" />
      </div>
      <Speaker clip={clip} small testId="model-audio" label="listen to the model" />

      {phase.kind === 'opening' && (
        <div className="audio-note" data-testid="mic-opening" role="status">🎤 ⏳</div>
      )}

      {phase.kind === 'mic_error' && <MicHelp error={phase.error} onRetry={openMic} />}

      {phase.kind !== 'opening' && phase.kind !== 'mic_error' && !(result?.status === 'correct') && (
        <div className="center" style={{ gap: 8 }}>
          <button
            className={`mic ${phase.kind === 'recording' ? 'recording' : ''}`}
            data-testid="mic-button"
            data-phase={phase.kind}
            aria-label="press and hold to record"
            disabled={!canRecord && phase.kind !== 'recording'}
            onPointerDown={(e) => {
              e.preventDefault();
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ }
              begin();
            }}
            onPointerUp={() => void finish()}
            onPointerCancel={() => void finish()}
            onLostPointerCapture={() => void finish()}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(); }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); void finish(); }
            }}
          >
            {phase.kind === 'assessing' ? '⏳' : '🎤'}
          </button>
          {isRetry && (
            <span className="mic-label" lang="ar" data-testid="rerecord-label">🎤 إِعَادَةُ التَّسْجِيلِ</span>
          )}
        </div>
      )}

      {phase.kind === 'ready' && phase.hint === 'hold_longer' && (
        <Feedback kind="info" testId="hint-hold-longer"><span lang="ar">👆 {instruction('hold_longer').text}</span></Feedback>
      )}

      {result?.status === 'correct' && (
        <>
          <Feedback kind="ok" testId="result-correct"><span lang="ar">✅ {instruction('correct').text} ⭐</span></Feedback>
          <button className="btn green wide" data-testid="next" onClick={onCorrect}>
            <span lang="ar">التَّالِي</span> <span aria-hidden>⬅️</span>
          </button>
        </>
      )}
      {result?.status === 'incorrect' && (
        <Feedback kind="try" testId="result-incorrect">
          <span lang="ar">🔄 {instruction('try_again').text}</span>
          {result.reason === 'too_long' && <span className="small" lang="ar" style={{ direction: 'rtl', fontSize: 24 }}>{instruction('say_short').text}</span>}
          {result.reason === 'too_short' && <span className="small" lang="ar" style={{ direction: 'rtl', fontSize: 24 }}>{instruction('say_long').text}</span>}
        </Feedback>
      )}
      {result?.status === 'no_speech' && (
        <Feedback kind="try" testId="result-no-speech"><span lang="ar">👂 {instruction('didnt_hear').text}</span></Feedback>
      )}
      {result?.status === 'unavailable' && (
        <Feedback kind="info" testId="result-unavailable">
          <span lang="ar">⚠️ {instruction('service_unavailable').text}</span>
          <span className="small">Pronunciation check is temporarily unavailable — nothing was marked correct. Please try again.</span>
        </Feedback>
      )}
      {phase.kind === 'practiced' && (
        <Feedback kind="info" testId="result-practice">
          <span lang="ar">🎧</span>
        </Feedback>
      )}
      {lastRecording && phase.kind !== 'recording' && (
        <button className="btn white" onClick={playBack} data-testid="play-own">
          <span aria-hidden>🔁</span> <span lang="ar" style={{ fontSize: '0.8em' }}>{instruction('listen_yourself').text}</span>
        </button>
      )}
    </section>
  );
}

function MicHelp({ error, onRetry }: { error: MicErrorKind; onRetry: () => void }) {
  const msg: Record<MicErrorKind, string> = {
    denied: 'The microphone is blocked. Grown-ups: tap the 🔒 / ⓘ icon next to the address bar, allow "Microphone", then tap 🔁 below. On iPad/iPhone: Settings → Safari → Microphone → Allow.',
    no_device: 'No microphone was found. Please connect a microphone or use a tablet/phone, then tap 🔁.',
    unsupported: 'This browser cannot record audio. Please use an up-to-date Chrome, Edge or Safari.',
    insecure: 'Recording only works over a secure connection (https:// or localhost).',
    unknown: 'The microphone could not start. Close other apps using it, then tap 🔁.',
  };
  return (
    <div className="card center" data-testid="mic-help" data-error={error} style={{ width: '100%' }}>
      <div style={{ fontSize: 60 }} aria-hidden>🎤🚫</div>
      <p className="parent" style={{ margin: 0 }}>{msg[error]}</p>
      <button className="btn blue" onClick={onRetry} data-testid="mic-retry">🔁</button>
    </div>
  );
}
