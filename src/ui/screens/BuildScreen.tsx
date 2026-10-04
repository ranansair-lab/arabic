import { useMemo, useRef, useState } from 'react';
import { instruction } from '../../curriculum/content';
import { buildSoundBank, isBuildCorrect, practiceQueue, type Tile } from '../../curriculum/activities';
import { eligibleLongWords, eligibleShortWords, masteredLongSounds, masteredShortSounds } from '../../curriculum/eligibility';
import type { DecodableWord } from '../../curriculum/types';
import { isLongVowelLevelUnlocked } from '../../services/progress/selectors';
import { useAudioPlayer, useLater, useProgress } from '../hooks';
import { Screen } from '../components/Screen';
import { ArabicText } from '../components/ArabicText';
import { EmptyState } from '../components/EmptyState';
import { Confetti, Feedback, Praise } from '../components/Feedback';
import { Instruction, Speaker } from '../components/Speaker';
import { clipOf } from '../components/LessonSteps';

/** 🧩 تَرْكِيبُ كَلِمَةٍ — audio first; the written word appears only after success. */
export function BuildScreen({ level }: { level: 1 | 2 }) {
  const { state, mastered, longMastered } = useProgress();
  // Snapshot eligibility when the screen opens so the queue is stable.
  const words = useMemo(
    () => (level === 1 ? eligibleShortWords(mastered) : eligibleLongWords(mastered, longMastered)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level],
  );
  const queue = useMemo(() => practiceQueue(words, state.wordsBuilt), [words]); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const backTo = level === 1 ? '/' : '/long';

  if (level === 2 && !isLongVowelLevelUnlocked(state)) {
    return <Screen testId="build" backTo={backTo}><EmptyState /></Screen>;
  }
  if (!queue.length) {
    return (
      <Screen testId="build" backTo={backTo}>
        <EmptyState detail="Word building uses only words whose every letter has been mastered." />
      </Screen>
    );
  }
  const word = queue[index % queue.length];
  return (
    <Screen testId="build" backTo={backTo}>
      <WordBuilder key={`${word.id}-${index}`} word={word} level={level} onNext={() => setIndex((i) => i + 1)} />
    </Screen>
  );
}

type Phase = 'building' | 'wrong' | 'separate' | 'close' | 'joined';

function WordBuilder({ word, level, onNext }: { word: DecodableWord; level: 1 | 2; onNext: () => void }) {
  const { store, mastered, longMastered } = useProgress();
  const player = useAudioPlayer();
  const later = useLater();
  const bank = useMemo<Tile[]>(() => {
    const sounds = level === 1 ? masteredShortSounds(mastered) : [...masteredShortSounds(mastered), ...masteredLongSounds(longMastered)];
    return buildSoundBank(word, sounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id]);
  const [slots, setSlots] = useState<(Tile | null)[]>(() => word.segments.map(() => null));
  const [phase, setPhase] = useState<Phase>('building');
  const advanced = useRef(false);
  const used = new Set(slots.filter(Boolean).map((t) => t!.key));
  const full = slots.every(Boolean);

  const place = (tile: Tile) => {
    if (phase !== 'building' && phase !== 'wrong') return;
    const i = slots.findIndex((s) => !s);
    if (i === -1) return;
    setPhase('building');
    setSlots(slots.map((s, k) => (k === i ? tile : s)));
  };
  const unplace = (i: number) => {
    if (phase !== 'building' && phase !== 'wrong') return;
    setSlots(slots.map((s, k) => (k === i ? null : s)));
  };

  const check = () => {
    const placed = slots.map((s) => s!.text);
    if (isBuildCorrect(word, placed)) {
      store.recordWordBuilt(word.id);
      setPhase('separate');
      later(() => setPhase('close'), 700);
      later(() => {
        setPhase('joined');
        void player.play(clipOf({ audio: word.audio, text: word.word })).then(() => {
          // Auto-advance after the success animation + word audio.
          later(() => {
            if (!advanced.current) { advanced.current = true; onNext(); }
          }, 900);
        });
      }, 1400);
      // Safety net: advance even if audio is slow / unavailable.
      later(() => {
        if (!advanced.current) { advanced.current = true; onNext(); }
      }, 6500);
    } else {
      setPhase('wrong');
      later(() => {
        setSlots(word.segments.map(() => null));
        void player.play(clipOf({ audio: word.audio, text: word.word }));
      }, 900);
    }
  };

  const success = phase === 'separate' || phase === 'close' || phase === 'joined';

  return (
    <section className="center" data-testid="word-builder" data-word-id={word.id} data-phase={phase}>
      <Instruction id="listen_word" icon="👂" />
      <Speaker clip={clipOf({ audio: word.audio, text: word.word })} autoPlay testId="word-audio" />

      {!success && (
        <>
          <div className="slots" data-testid="slots">
            {slots.map((s, i) => (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && <span className="plus" aria-hidden>+</span>}
                <button className={`slot ${s ? 'filled' : ''}`} onClick={() => unplace(i)} data-testid="slot" data-value={s?.text ?? ''} aria-label={`slot ${i + 1}`}>
                  {s && <ArabicText text={s.text} size="m" />}
                </button>
              </span>
            ))}
          </div>
          <div className="bank" data-testid="bank">
            {bank.map((t) => (
              <button key={t.key} className={`tile ${used.has(t.key) ? 'used' : ''}`} onClick={() => place(t)} data-testid="bank-tile" data-value={t.text} disabled={used.has(t.key)}>
                <ArabicText text={t.text} size="m" />
              </button>
            ))}
          </div>
          <button className="btn green wide" disabled={!full || phase === 'wrong'} onClick={check} data-testid="check">
            <span lang="ar">تَحَقَّقْ</span> <span aria-hidden>✔️</span>
          </button>
          {phase === 'wrong' && (
            <Feedback kind="try" testId="build-wrong"><span lang="ar">{instruction('listen_again_try').text}</span></Feedback>
          )}
        </>
      )}

      {success && (
        <div className="card center" style={{ width: '100%' }} data-testid="build-success">
          <Confetti />
          <div className={`assemble ${phase}`} data-testid="assembled" data-phase={phase}>
            {phase === 'joined' ? (
              <ArabicText text={word.word} size="l" testId="joined-word" />
            ) : (
              word.segments.map((s, i) => <span key={i} className="part"><ArabicText text={s} size="l" /></span>)
            )}
          </div>
          <Feedback kind="ok"><Praise fixed="well_done" /></Feedback>
        </div>
      )}
    </section>
  );
}
