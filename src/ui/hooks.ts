import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { LocalStorageRepository } from '../services/progress/repository';
import { ProgressStore } from '../services/progress/store';
import { longMasteredLetters, masteredLetters } from '../services/progress/selectors';
import { audioService, AudioUnavailableError, type AudioClip } from '../services/audio/audioService';

export const progressStore = new ProgressStore(new LocalStorageRepository());

export function useProgress() {
  const state = useSyncExternalStore(progressStore.subscribe, progressStore.getState);
  const mastered = useMemo(() => masteredLetters(state), [state]);
  const longMastered = useMemo(() => longMasteredLetters(state), [state]);
  return { state, store: progressStore, mastered, longMastered };
}

export type AudioStatus = 'idle' | 'playing' | 'unavailable';

/** Audio playback state for one clip (or sequence). Never throws into render. */
export function useAudioPlayer() {
  const [status, setStatus] = useState<AudioStatus>('idle');
  const [index, setIndex] = useState(-1);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      audioService.stop();
    };
  }, []);

  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setStatus('playing');
    try {
      await fn();
      if (mounted.current) setStatus('idle');
      return true;
    } catch (err) {
      if (!(err instanceof AudioUnavailableError)) console.error(err);
      if (mounted.current) setStatus('unavailable');
      return false;
    } finally {
      if (mounted.current) setIndex(-1);
    }
  };

  return {
    status,
    index,
    play: (clip: AudioClip) => run(() => audioService.play(clip)),
    playSequence: (clips: AudioClip[]) => run(() => audioService.playSequence(clips, (i) => mounted.current && setIndex(i))),
    stop: () => audioService.stop(),
  };
}

/** Runs `fn` after `ms` unless the component unmounts first. */
export function useLater() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  return (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
}
