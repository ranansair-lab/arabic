import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSentence, instruction, MINI_STORIES } from '../../curriculum/content';
import { eligibleMiniStories, eligibleSentences, isSentenceEligible } from '../../curriculum/eligibility';
import { practiceQueue } from '../../curriculum/activities';
import { shuffleChanged } from '../../curriculum/random';
import type { Sentence } from '../../curriculum/types';
import { getPronunciationService } from '../../services/pronunciation';
import { isMiniStoryLevelUnlocked, isSentenceLevelUnlocked } from '../../services/progress/selectors';
import { useLater, useProgress } from '../hooks';
import { Screen } from '../components/Screen';
import { ArabicText } from '../components/ArabicText';
import { EmptyState } from '../components/EmptyState';
import { Confetti, Feedback, Praise, Stars } from '../components/Feedback';
import { Instruction, Speaker } from '../components/Speaker';
import { PronunciationStep } from '../components/PronunciationStep';

const sentenceClip = (s: Sentence) => ({ audio: s.audio, text: s.text });

/** 📝 Sentence level: read (audio + recording) → picture comprehension. */
export function SentencesScreen() {
  const { state, mastered } = useProgress();
  const sentences = useMemo(() => practiceQueue(eligibleSentences(mastered), state.sentencesRead), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  if (!isSentenceLevelUnlocked(state) || !sentences.length) {
    return (
      <Screen testId="sentences" backTo="/">
        <EmptyState messageId={sentences.length ? 'learn_more_words' : 'learn_more'} emoji="📝" />
      </Screen>
    );
  }
  const s = sentences[index % sentences.length];
  return (
    <Screen testId="sentences" backTo="/">
      <SentenceReader key={`${s.id}-${index}`} sentence={s} onDone={() => setIndex((i) => i + 1)} />
    </Screen>
  );
}

function SentenceReader({ sentence, onDone, nextLabel }: { sentence: Sentence; onDone: () => void; nextLabel?: string }) {
  const { store } = useProgress();
  const later = useLater();
  const [stage, setStage] = useState<'read' | 'picture'>('read');
  const [recorded, setRecorded] = useState(false);
  const [picked, setPicked] = useState<{ v: string; ok: boolean; n: number } | null>(null);
  const pictures = useMemo(() => shuffleChanged([sentence.picture, ...sentence.distractors]), [sentence.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const service = getPronunciationService();
  // Sentences are scored only by an engine that can verify whole utterances.
  const mode = service.verifies.includes('consonant') ? 'assess' : 'practice';

  if (stage === 'read') {
    return (
      <section className="center" data-testid="sentence-read" data-sentence-id={sentence.id}>
        <Instruction id="read_sentence" icon="📖" />
        <PronunciationStep
          target={{ id: `sentence:${sentence.id}`, text: sentence.text, phonemes: sentence.words.join(' '), vowel: 'fatha', length: 'short', lengthMode: 'short_lenient' }}
          clip={sentenceClip(sentence)}
          mode={mode}
          targetSize="m"
          onCorrect={() => setStage('picture')}
          onPracticed={() => setRecorded(true)}
        />
        {mode === 'practice' && (
          <button className="btn green wide" onClick={() => setStage('picture')} data-testid="to-picture" disabled={!recorded}>
            <span lang="ar">التَّالِي</span> <span aria-hidden>⬅️</span>
          </button>
        )}
        {mode === 'practice' && !recorded && (
          <button className="btn white" onClick={() => setStage('picture')} data-testid="skip-recording" aria-label="continue without recording">⏭️</button>
        )}
      </section>
    );
  }

  const choose = (emoji: string) => {
    if (picked?.ok) return;
    const ok = emoji === sentence.picture.emoji;
    setPicked({ v: emoji, ok, n: (picked?.n ?? 0) + 1 });
    if (ok) {
      store.completeSentence(sentence.id);
      later(onDone, 1800);
    }
  };

  return (
    <section className="center" data-testid="sentence-picture" data-sentence-id={sentence.id}>
      <div className="card center" style={{ width: '100%' }}>
        <ArabicText text={sentence.text} size="m" />
      </div>
      <Speaker clip={sentenceClip(sentence)} small />
      <Instruction id="which_picture" icon="🖼️" />
      <div className="pictures">
        {pictures.map((p) => (
          <button key={`${p.emoji}-${picked?.v === p.emoji ? picked.n : 0}`} className={`choice picture ${picked?.v === p.emoji ? (picked.ok ? 'correct' : 'wrong') : ''}`}
            onClick={() => choose(p.emoji)} data-testid="picture-choice" data-value={p.emoji} aria-label={p.label}>
            {p.emoji}
          </button>
        ))}
      </div>
      {picked && !picked.ok && <Feedback kind="try"><span lang="ar">{instruction('try_again').text}</span></Feedback>}
      {picked?.ok && <Feedback kind="ok" testId="sentence-correct"><Praise />{nextLabel}</Feedback>}
    </section>
  );
}

/** 📚 Mini decodable stories — three decodable sentences, one per screen. */
export function MiniStoriesScreen() {
  const navigate = useNavigate();
  const { state, mastered } = useProgress();
  const stories = eligibleMiniStories(mastered);
  if (!isMiniStoryLevelUnlocked(state) || !stories.length) {
    return <Screen testId="mini-stories" backTo="/"><EmptyState messageId="learn_more_words" emoji="📚" /></Screen>;
  }
  return (
    <Screen testId="mini-stories" backTo="/">
      <h1 className="title" lang="ar">📚 قِصَصٌ قَصِيرَةٌ</h1>
      <div className="activity-row">
        {stories.map((m) => (
          <button key={m.id} className="activity" onClick={() => navigate(`/mini-stories/${m.id}`)} data-testid={`mini-${m.id}`}>
            <span className="emoji" aria-hidden>{m.emoji}</span>
            <span aria-hidden>{state.miniStoriesRead[m.id] ? '⭐' : '📖'}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}

export function MiniStoryScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { state, store, mastered } = useProgress();
  const story = MINI_STORIES.find((m) => m.id === id);
  const [i, setI] = useState(0);
  if (!story || !isMiniStoryLevelUnlocked(state) || !story.requiredLetters.every((l) => mastered.has(l))) {
    return <Screen testId="mini-story" backTo="/mini-stories"><EmptyState messageId="learn_more_words" emoji="📚" /></Screen>;
  }
  const sentences = story.sentenceIds.map((sid) => getSentence(sid)!).filter((s) => s && isSentenceEligible(s, mastered));
  if (i >= sentences.length) {
    return (
      <Screen testId="mini-story-complete" backTo="/mini-stories">
        <Confetti />
        <div className="card center">
          <div style={{ fontSize: 80 }} aria-hidden>{story.emoji}</div>
          <Stars n={3} />
          <p className="title" lang="ar">{instruction('excellent').text}</p>
          <button className="btn green wide" onClick={() => navigate('/mini-stories')}>📚</button>
        </div>
      </Screen>
    );
  }
  return (
    <Screen testId="mini-story" backTo="/mini-stories" right={<span style={{ fontSize: 28 }}>{'⭐'.repeat(i)}{'☆'.repeat(sentences.length - i)}</span>}>
      <SentenceReader
        key={sentences[i].id}
        sentence={sentences[i]}
        onDone={() => {
          if (i + 1 >= sentences.length) store.completeMiniStory(story.id);
          setI(i + 1);
        }}
      />
    </Screen>
  );
}
