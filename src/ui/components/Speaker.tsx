import { useEffect, useRef } from 'react';
import type { AudioClip } from '../../services/audio/audioService';
import { instruction } from '../../curriculum/content';
import { useAudioPlayer } from '../hooks';

interface Props {
  clip: AudioClip;
  autoPlay?: boolean;
  small?: boolean;
  testId?: string;
  onDone?: (played: boolean) => void;
  label?: string;
}

/** Big 🔊 button with playing + unavailable states (never silent failure). */
export function Speaker({ clip, autoPlay, small, testId = 'speaker', onDone, label }: Props) {
  const player = useAudioPlayer();
  const started = useRef<string | null>(null);
  const play = async () => {
    const ok = await player.play(clip);
    onDone?.(ok);
  };
  useEffect(() => {
    if (autoPlay && started.current !== clip.audio) {
      started.current = clip.audio;
      void play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.audio, autoPlay]);

  return (
    <div className="center" style={{ gap: 6 }}>
      <button
        className={`speaker ${small ? 'small' : ''} ${player.status}`}
        onClick={play}
        aria-label={label ?? 'play sound'}
        data-testid={testId}
        data-status={player.status}
      >
        {player.status === 'unavailable' ? '🔇' : '🔊'}
      </button>
      {player.status === 'unavailable' && <AudioUnavailableNote onRetry={play} />}
    </div>
  );
}

export function AudioUnavailableNote({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="audio-note" data-testid="audio-unavailable" role="status">
      <span lang="ar">{instruction('audio_unavailable').text}</span>
      {onRetry && (
        <button className="speak-mini" onClick={onRetry} aria-label="retry audio">🔁</button>
      )}
    </div>
  );
}

/** Instruction line with icon and a small speaker for the spoken instruction. */
export function Instruction({ id, icon, testId }: { id: string; icon?: string; testId?: string }) {
  const ins = instruction(id);
  const player = useAudioPlayer();
  return (
    <div className="instruction" data-testid={testId ?? `instruction-${id}`}>
      {icon && <span className="icon" aria-hidden>{icon}</span>}
      <span lang="ar">{ins.text}</span>
      <button className="speak-mini" aria-label="hear instruction" onClick={() => player.play(ins)}>
        {player.status === 'unavailable' ? '🔇' : '🔈'}
      </button>
    </div>
  );
}
