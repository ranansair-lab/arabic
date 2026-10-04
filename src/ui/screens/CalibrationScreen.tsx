import { useEffect, useRef, useState } from 'react';
import { LETTERS } from '../../curriculum/content';
import { HoldRecorder, MicError } from '../../services/pronunciation/recorder';
import { analyseVowel, judgeVowel, type VowelAnalysis } from '../../services/pronunciation/vowelAnalysis';
import type { LengthMode } from '../../services/pronunciation/types';
import { Screen } from '../components/Screen';
import { ArabicText } from '../components/ArabicText';

interface Row { target: string; mode: LengthMode; verdict: string; a: VowelAnalysis }

/**
 * Teacher tool: record real children saying مَ / مِ / مُ / مَا … and see what the
 * on-device engine measures. Use it to validate (and tune) thresholds before release.
 */
export function CalibrationScreen() {
  const meem = LETTERS.find((l) => l.char === 'م')!;
  const targets = [...meem.forms.map((f) => ({ f, mode: 'short_lenient' as LengthMode })), ...meem.longForms.map((f) => ({ f, mode: 'long' as LengthMode }))];
  const [sel, setSel] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [rec, setRec] = useState(false);
  const [err, setErr] = useState('');
  const recorder = useRef<HoldRecorder | null>(null);
  useEffect(() => () => recorder.current?.close(), []);

  const start = async () => {
    try {
      recorder.current ??= new HoldRecorder();
      await recorder.current.start();
      setRec(true);
      setErr('');
    } catch (e) {
      setErr(e instanceof MicError ? e.kind : String(e));
    }
  };
  const stop = async () => {
    if (!rec || !recorder.current) return;
    setRec(false);
    const audio = await recorder.current.stop();
    const a = analyseVowel(audio);
    const t = targets[sel];
    const r = judgeVowel(a, { id: t.f.id, text: t.f.text, phonemes: t.f.phonemes, vowel: t.f.vowel, length: t.f.length, lengthMode: t.mode });
    setRows((rs) => [{ target: t.f.text, mode: t.mode, verdict: r.status + ('reason' in r ? `:${r.reason}` : ''), a }, ...rs]);
  };

  return (
    <Screen testId="calibrate" backTo="/progress">
      <div className="card parent">
        <h2>Pronunciation calibration (teachers)</h2>
        <p>Choose a target, then press and hold the mic while the child says it. Record each child several times for every target. A reliable engine shows <b>correct</b> for the matching target and <b>incorrect</b> for the others. Copy the results to share them with the developer.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', direction: 'rtl' }}>
          {targets.map((t, i) => (
            <button key={t.f.id} className={`choice ${i === sel ? 'correct' : ''}`} style={{ minHeight: 80, minWidth: 80 }} onClick={() => setSel(i)}>
              <ArabicText text={t.f.text} size="s" />
            </button>
          ))}
        </div>
        <div className="center" style={{ margin: '12px 0' }}>
          <button className={`mic ${rec ? 'recording' : ''}`} onPointerDown={(e) => { e.preventDefault(); void start(); }} onPointerUp={() => void stop()} onPointerLeave={() => void stop()} onContextMenu={(e) => e.preventDefault()}>🎤</button>
          {err && <p>Microphone error: {err}</p>}
        </div>
        <button className="btn white" style={{ minHeight: 44, fontSize: 16 }} onClick={() => void navigator.clipboard?.writeText(JSON.stringify(rows.map((r) => ({ target: r.target, verdict: r.verdict, ...r.a })), null, 1))}>Copy results (JSON)</button>
        <table style={{ marginTop: 10 }}>
          <thead><tr><th>Target</th><th>Verdict</th><th>Heard</th><th>conf</th><th>ms</th><th>F0/F1/F2</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="ar">{r.target}</td>
                <td>{r.verdict}</td>
                <td>{r.a.vowel ?? '—'}</td>
                <td>{r.a.confidence.toFixed(2)}</td>
                <td>{r.a.vowelMs}</td>
                <td>{r.a.f0.toFixed(0)}/{r.a.f1.toFixed(0)}/{r.a.f2.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Screen>
  );
}
