import { describe, expect, it } from 'vitest';
import { RemotePronunciationEngine, parseRemoteResult } from '../../src/services/pronunciation/remoteEngine';
import type { PronunciationTarget } from '../../src/services/pronunciation/types';

const target: PronunciationTarget = { id: 'meem_a', text: 'مَ', phonemes: 'ma', vowel: 'fatha', length: 'short', lengthMode: 'short_lenient' };
const audio = { samples: new Float32Array(4800), sampleRate: 48000, durationMs: 100 };
const engine = (impl: typeof fetch) => new RemotePronunciationEngine('https://example.test/assess', 200, impl);
const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });

describe('remote engine never fakes success', () => {
  it('passes through a correct verdict and sends the target', async () => {
    let sent: FormData | null = null;
    const r = await engine(async (_u, init) => { sent = init!.body as FormData; return new Response(JSON.stringify({ status: 'correct', detected: 'ma', score: 0.93 })); }).assess(audio, target);
    expect(r).toMatchObject({ status: 'correct', detected: 'ma' });
    expect(JSON.parse(sent!.get('target') as string).phonemes).toBe('ma');
    expect((sent!.get('audio') as Blob).type).toBe('audio/wav');
  });
  it('incorrect verdict keeps its reason', async () => {
    expect(await engine(json({ status: 'incorrect', reason: 'wrong_vowel', detected: 'mi' })).assess(audio, target)).toMatchObject({ status: 'incorrect', reason: 'wrong_vowel' });
  });
  it('network error → unavailable', async () => {
    expect((await engine(async () => { throw new TypeError('offline'); }).assess(audio, target)).status).toBe('unavailable');
  });
  it('HTTP 500 → unavailable', async () => {
    expect((await engine(json({ status: 'correct' }, 500)).assess(audio, target)).status).toBe('unavailable');
  });
  it('timeout → unavailable', async () => {
    const slow: typeof fetch = (_u, init) => new Promise((_, rej) => init!.signal!.addEventListener('abort', () => rej(new Error('aborted'))));
    expect((await engine(slow).assess(audio, target)).status).toBe('unavailable');
  });
  it('malformed / unknown bodies → unavailable', () => {
    expect(parseRemoteResult(null, []).status).toBe('unavailable');
    expect(parseRemoteResult({ status: 'great!' }, []).status).toBe('unavailable');
    expect(parseRemoteResult({ ok: true }, []).status).toBe('unavailable');
  });
});
