import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStory, instruction } from '../../curriculum/content';
import { storyLetterChoices } from '../../curriculum/activities';
import { eligibleStories, isStoryEligible } from '../../curriculum/eligibility';
import type { Story } from '../../curriculum/types';
import { audioService } from '../../services/audio/audioService';
import { useAudioPlayer, useLater, useProgress } from '../hooks';
import { Screen } from '../components/Screen';
import { ArabicText } from '../components/ArabicText';
import { EmptyState } from '../components/EmptyState';
import { Confetti, Feedback, Praise } from '../components/Feedback';
import { AudioUnavailableNote, Instruction } from '../components/Speaker';

/** 📖 قِصَّةُ حَرْفٍ — only stories for mastered letters. */
export function StoriesListScreen() {
  const navigate = useNavigate();
  const { state, mastered } = useProgress();
  const stories = eligibleStories(mastered);
  return (
    <Screen testId="stories" backTo="/">
      {!stories.length ? (
        <EmptyState emoji="📖" />
      ) : (
        <>
          <h1 className="title" lang="ar">📖 قِصَّةُ حَرْفٍ</h1>
          <div className="letter-grid" data-testid="story-list">
            {stories.map((s, i) => (
              <button
                key={s.letterId}
                className="letter-tile"
                style={{ background: ['var(--c5)', 'var(--c4)', 'var(--c2)', 'var(--c6)'][i % 4] }}
                onClick={() => navigate(`/stories/${s.letterId}`)}
                data-testid={`story-${s.letterId}`}
                lang="ar"
              >
                {s.letter}
                <span className="star" aria-hidden>{state.storiesCompleted[s.letterId] ? '⭐' : '📖'}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

export function StoryScreen() {
  const { letterId = '' } = useParams();
  const { mastered } = useProgress();
  const story = getStory(letterId);
  // Guard deep links: never show a story for an unlearned letter.
  if (!story || !isStoryEligible(story, mastered)) {
    return <Screen testId="story" backTo="/stories"><EmptyState emoji="📖" /></Screen>;
  }
  return <StoryReader key={story.letterId} story={story} />;
}

function StoryReader({ story }: { story: Story }) {
  const navigate = useNavigate();
  const { store, mastered } = useProgress();
  const player = useAudioPlayer();
  const later = useLater();
  const [listened, setListened] = useState(false);
  const [picked, setPicked] = useState<{ v: string; ok: boolean; n: number } | null>(null);
  const choices = useMemo(() => storyLetterChoices(story, mastered), [story]); // eslint-disable-line react-hooks/exhaustive-deps

  const listen = async () => {
    setPicked((p) => (p?.ok ? p : null));
    const sentenceClips = story.sentences.map((text, i) => ({ audio: story.sentenceAudio[i], text }));
    const perSentence = sentenceClips.every((c) => audioService.hasRecording(c));
    if (perSentence || !audioService.hasRecording(story.audio)) {
      // Per-sentence recordings (or dev TTS) allow sentence highlighting.
      await player.playSequence(sentenceClips);
    } else {
      await player.play({ audio: story.audio, text: story.sentences.join(' ') });
    }
    setListened(true);
    later(() => void player.play(instruction('most_letter')), 300);
  };

  const choose = (v: string) => {
    if (picked?.ok) return;
    const ok = v === story.letter;
    setPicked({ v, ok, n: (picked?.n ?? 0) + 1 });
    if (ok) store.completeStory(story.letterId);
  };

  return (
    <Screen testId="story" backTo="/stories">
      <h1 className="title" lang="ar">{story.title}</h1>
      <div className="card story-text" data-testid="story-text">
        {story.sentences.map((s, i) => (
          <ArabicText key={i} text={s} size="s" className={`story-line ${player.index === i ? 'active' : ''}`} />
        ))}
      </div>
      <button className={`btn blue wide ${player.status === 'playing' ? 'playing' : ''}`} onClick={listen} data-testid="listen-story" disabled={player.status === 'playing'}>
        <span aria-hidden>🔊</span> <span lang="ar">{instruction('listen_story').text}</span>
      </button>
      {player.status === 'unavailable' && <AudioUnavailableNote onRetry={listen} />}

      {listened && (
        <section className="center" data-testid="story-question">
          <Instruction id="most_letter" icon="👂" />
          <div className="choices">
            {choices.map((c) => (
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
          {picked && !picked.ok && (
            <>
              <Feedback kind="try" testId="story-wrong"><span lang="ar">{instruction('listen_story_again').text}</span></Feedback>
              <button className="btn blue" onClick={listen} data-testid="replay-story">🔊 🔁</button>
            </>
          )}
          {picked?.ok && (
            <>
              <Confetti />
              <Feedback kind="ok" testId="story-correct">⭐ <Praise fixed="well_done" /></Feedback>
              <button className="btn green wide" onClick={() => navigate('/stories')} data-testid="next">
                <span aria-hidden>📖</span> <span lang="ar">التَّالِي</span>
              </button>
            </>
          )}
        </section>
      )}
    </Screen>
  );
}
