import { useEffect, useState } from 'react';
import type { VowelledSound } from '../../curriculum/types';
import { instruction } from '../../curriculum/content';
import { progressStore, useAudioPlayer, useLater } from '../hooks';
import { ArabicText } from './ArabicText';
import { Feedback, Praise } from './Feedback';
import { Instruction, Speaker } from './Speaker';

export const clipOf = (s: { audio: string; text: string }) => ({ audio: s.audio, text: s.text });

/** STEP 1 — only the target, large, with its diacritic, and 🔊. */
export function ListenStep({ sound, onNext }: { sound: VowelledSound; onNext: () => void }) {
  return (
    <section className="center" data-testid="step-listen" data-target={sound.text}>
      <Instruction id="listen_carefully" icon="👂" />
      <div className="card center" style={{ width: '100%', padding: '0 12px' }}>
        <ArabicText text={sound.text} size="xl" testId="listen-target" />
      </div>
      <Speaker clip={clipOf(sound)} autoPlay testId="target-audio" />
      <button className="btn green wide" data-testid="next" onClick={onNext}>
        <span lang="ar">التَّالِي</span> <span aria-hidden>⬅️</span>
      </button>
    </section>
  );
}

interface DiscriminationProps {
  target: VowelledSound;
  choices: VowelledSound[];
  onCorrect: () => void;
  testId?: string;
}

/** STEP 2 — أَيُّ صَوْتٍ سَمِعْتَ؟ Wrong answers replay the sound; the answer is never revealed. */
export function DiscriminationStep({ target, choices, onCorrect, testId = 'step-discriminate' }: DiscriminationProps) {
  const [picked, setPicked] = useState<{ id: string; ok: boolean; n: number } | null>(null);
  const player = useAudioPlayer();
  const later = useLater();
  useEffect(() => setPicked(null), [target.id]);

  const choose = (s: VowelledSound) => {
    if (picked?.ok) return;
    const ok = s.id === target.id;
    progressStore.recordDiscrimination(ok);
    setPicked({ id: s.id, ok, n: (picked?.n ?? 0) + 1 });
    if (ok) later(onCorrect, 1400);
    else later(() => void player.play(clipOf(target)), 500);
  };

  return (
    <section className="center" data-testid={testId} data-target={target.text}>
      <Instruction id="which_sound" icon="👂" />
      <Speaker clip={clipOf(target)} autoPlay testId="target-audio" />
      <div className="choices" role="group">
        {choices.map((c) => (
          <button
            key={`${c.id}-${picked?.id === c.id ? picked.n : 0}`}
            className={`choice ${picked?.id === c.id ? (picked.ok ? 'correct' : 'wrong') : ''}`}
            onClick={() => choose(c)}
            data-testid="choice"
            data-value={c.text}
          >
            <ArabicText text={c.text} size="l" />
          </button>
        ))}
      </div>
      {picked?.ok && <Feedback kind="ok"><Praise fixed="well_done" /></Feedback>}
      {picked && !picked.ok && (
        <Feedback kind="try"><span lang="ar">{instruction('try_again').text}</span></Feedback>
      )}
    </section>
  );
}
