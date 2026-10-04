import { useEffect, useMemo, useState } from 'react';
import type { InitialSoundRound } from '../../curriculum/activities';
import type { SoundWord } from '../../curriculum/types';
import { instruction } from '../../curriculum/content';
import { playApplause } from '../../services/audio/applause';
import { useAudioPlayer, useLater } from '../hooks';
import { ArabicText } from './ArabicText';
import { Feedback, Praise } from './Feedback';
import { clipOf } from './LessonSteps';
import { Instruction, Speaker } from './Speaker';

const COLOURS = ['#ff5d73', '#ffb347', '#ffe066', '#6fdc8c', '#5aa9ff', '#b388ff'];

/** Colourful paper confetti for the game's reward moment. */
export function PaperConfetti() {
  const pieces = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.6 + Math.random() * 1.2,
      colour: COLOURS[i % COLOURS.length],
      round: i % 4 === 0,
    })),
    [],
  );
  return (
    <div className="confetti paper" aria-hidden data-testid="confetti">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{ left: `${p.left}%`, background: p.colour, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, borderRadius: p.round ? '50%' : 2 }}
        />
      ))}
    </div>
  );
}

function WordCard({ word, state, onChoose }: { word: SoundWord; state: '' | 'correct' | 'wrong'; onChoose: () => void }) {
  const player = useAudioPlayer();
  return (
    <div className="sound-card">
      <button className={`choice ${state}`} onClick={onChoose} data-testid="word-choice" data-sound-id={word.soundId} aria-label={word.gloss}>
        <span className="emoji" aria-hidden>{word.emoji}</span>
        <ArabicText text={word.word} size="s" />
      </button>
      <button className="speak-mini" aria-label={`hear ${word.gloss}`} data-testid="word-audio" onClick={() => player.play({ audio: word.audio, text: word.word })}>
        {player.status === 'unavailable' ? '🔇' : '🔈'}
      </button>
    </div>
  );
}

interface Props {
  round: InitialSoundRound;
  /** Called after the celebration for a correct answer. */
  onNext: () => void;
}

/**
 * The child hears a sound (مَ) and picks the picture word that starts with it
 * (مَطَر). A wrong choice replays the sound and never reveals the answer; the
 * right one is rewarded with confetti and clapping.
 */
export function InitialSoundGame({ round, onNext }: Props) {
  const [picked, setPicked] = useState<{ id: string; ok: boolean; n: number } | null>(null);
  const player = useAudioPlayer();
  const later = useLater();
  useEffect(() => setPicked(null), [round.sound.id]);

  const choose = (w: SoundWord) => {
    if (picked?.ok) return;
    const ok = w.soundId === round.answer.soundId;
    setPicked({ id: w.soundId, ok, n: (picked?.n ?? 0) + 1 });
    if (ok) {
      void playApplause();
      later(onNext, 3000);
    } else {
      later(() => void player.play(clipOf(round.sound)), 500);
    }
  };

  return (
    <section className="center" data-testid="step-sound-game" data-target={round.sound.id}>
      {picked?.ok && <PaperConfetti />}
      <Instruction id="which_word_starts" icon="🎮" />
      <div className="sound-prompt">
        <ArabicText text={round.sound.text} size="l" testId="game-sound" />
        <Speaker clip={clipOf(round.sound)} autoPlay small testId="target-audio" />
      </div>
      <div className="sound-cards" role="group">
        {round.choices.map((w) => (
          <WordCard
            key={`${w.soundId}-${picked?.id === w.soundId ? picked.n : 0}`}
            word={w}
            state={picked?.id === w.soundId ? (picked.ok ? 'correct' : 'wrong') : ''}
            onChoose={() => choose(w)}
          />
        ))}
      </div>
      {picked?.ok && <Feedback kind="ok" testId="game-correct"><Praise /> <span aria-hidden>👏</span></Feedback>}
      {picked && !picked.ok && (
        <Feedback kind="try"><span lang="ar">{instruction('try_again').text}</span></Feedback>
      )}
    </section>
  );
}
