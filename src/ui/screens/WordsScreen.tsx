import { useMemo, useState } from 'react';
import { instruction } from '../../curriculum/content';
import { ANALYSIS_INSTRUCTION, analysisKindsFor, analysisQuestion, practiceQueue } from '../../curriculum/activities';
import { eligibleLongWords, eligibleShortWords, masteredLongSounds, masteredShortSounds } from '../../curriculum/eligibility';
import type { DecodableWord } from '../../curriculum/types';
import { useAudioPlayer, useLater, useProgress } from '../hooks';
import { Screen } from '../components/Screen';
import { ArabicText } from '../components/ArabicText';
import { EmptyState } from '../components/EmptyState';
import { Feedback, Praise } from '../components/Feedback';
import { Instruction, Speaker } from '../components/Speaker';
import { clipOf } from '../components/LessonSteps';

/** ⭐ كَلِمَاتِي — analyse decodable words into their vowelled sounds. */
export function WordsScreen() {
  const { state, mastered, longMastered } = useProgress();
  const words = useMemo(
    () => [...eligibleShortWords(mastered), ...eligibleLongWords(mastered, longMastered)],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const queue = useMemo(() => practiceQueue(words, state.wordsAnalysed), [words]); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  if (!queue.length) {
    return (
      <Screen testId="words" backTo="/">
        <EmptyState detail="كلماتي shows only words made entirely of letters the child has mastered." />
      </Screen>
    );
  }
  const word = queue[index % queue.length];
  // Rotate question type: first → last → middle (where the word has a middle).
  const kinds = analysisKindsFor(word);
  const kind = kinds[Math.floor(index / queue.length) % kinds.length] ?? 'first';
  return (
    <Screen testId="words" backTo="/">
      <WordAnalysis key={`${word.id}-${index}`} word={word} kind={kind} onNext={() => setIndex((i) => i + 1)} />
    </Screen>
  );
}

function WordAnalysis({ word, kind, onNext }: { word: DecodableWord; kind: 'first' | 'middle' | 'last'; onNext: () => void }) {
  const { store, mastered, longMastered } = useProgress();
  const player = useAudioPlayer();
  const later = useLater();
  const q = useMemo(
    () => analysisQuestion(word, kind, [...masteredShortSounds(mastered), ...masteredLongSounds(longMastered)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [word.id, kind],
  );
  const [picked, setPicked] = useState<{ v: string; ok: boolean; n: number } | null>(null);
  const clip = clipOf({ audio: word.audio, text: word.word });

  const choose = (v: string) => {
    if (picked?.ok) return;
    const ok = v === q.answer;
    setPicked({ v, ok, n: (picked?.n ?? 0) + 1 });
    if (ok) store.recordWordAnalysed(word.id);
    else later(() => void player.play(clip), 500);
  };

  return (
    <section className="center" data-testid="word-analysis" data-word-id={word.id} data-kind={kind}>
      <div className="card center" style={{ width: '100%', padding: '0 12px' }}>
        <ArabicText text={word.word} size="l" testId="analysis-word" />
      </div>
      <Speaker clip={clip} small testId="word-audio" />
      <Instruction id={ANALYSIS_INSTRUCTION[kind]} icon="🔍" />
      <div className="choices">
        {q.choices.map((c) => (
          <button
            key={`${c}-${picked?.v === c ? picked.n : 0}`}
            className={`choice ${picked?.v === c ? (picked.ok ? 'correct' : 'wrong') : ''}`}
            onClick={() => choose(c)}
            data-testid="choice"
            data-value={c}
          >
            <ArabicText text={c} size="l" />
          </button>
        ))}
      </div>
      {picked && !picked.ok && <Feedback kind="try"><span lang="ar">{instruction('try_again').text}</span></Feedback>}
      {picked?.ok && (
        <>
          <Feedback kind="ok"><Praise /></Feedback>
          <div className="card center" style={{ width: '100%' }} data-testid="segmentation">
            <ArabicText text={word.segments.join(' + ')} size="m" />
          </div>
          <button className="btn green wide" onClick={onNext} data-testid="next">
            <span lang="ar">التَّالِي</span> <span aria-hidden>⬅️</span>
          </button>
        </>
      )}
    </section>
  );
}
