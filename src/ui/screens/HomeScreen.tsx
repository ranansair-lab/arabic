import { useNavigate } from 'react-router-dom';
import { instruction, LETTERS, MINI_STORIES, SENTENCES } from '../../curriculum/content';
import { CURRICULUM_RULES } from '../../curriculum/levels';
import { eligibleShortWords, eligibleStories, eligibleLongWords } from '../../curriculum/eligibility';
import { completedShortForms, isLongVowelLevelUnlocked, isMiniStoryLevelUnlocked, isSentenceLevelUnlocked } from '../../services/progress/selectors';
import { useAudioPlayer, useProgress } from '../hooks';

const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)'];

export function HomeScreen() {
  const navigate = useNavigate();
  const { state, mastered, longMastered } = useProgress();
  const wordCount = eligibleShortWords(mastered).length + eligibleLongWords(mastered, longMastered).length;
  const storyCount = eligibleStories(mastered).length;
  const longUnlocked = isLongVowelLevelUnlocked(state);
  const sentencesUnlocked = isSentenceLevelUnlocked(state);
  const miniUnlocked = isMiniStoryLevelUnlocked(state);

  return (
    <main className="screen" data-testid="home">
      <nav className="topbar">
        <button className="icon-btn" aria-label="progress for grown-ups" data-testid="nav-progress" onClick={() => navigate('/progress')}>📊</button>
        <span className="spacer" />
      </nav>

      <header className="center" style={{ gap: 0 }}>
        <ChooseLetterTitle />
      </header>

      <section className="letter-grid" aria-label="letters" data-testid="letter-grid">
        {LETTERS.map((l, i) => {
          const done = completedShortForms(state, l);
          const isMastered = mastered.has(l.char);
          return (
            <button
              key={l.id}
              className={`letter-tile ${isMastered ? 'mastered' : ''}`}
              style={{ background: COLORS[i % COLORS.length] }}
              onClick={() => navigate(`/letter/${l.id}`)}
              data-testid={`letter-${l.id}`}
              data-mastered={isMastered}
              aria-label={`${l.char}${isMastered ? ' ✓' : ''}`}
              lang="ar"
            >
              {l.char}
              {isMastered && <span className="badge" data-testid="mastered-check">✓</span>}
              {isMastered && <span className="star" aria-hidden>⭐</span>}
              {!isMastered && done > 0 && (
                <span className="pips" aria-hidden>
                  {l.forms.map((f, k) => <span key={f.id} className={`pip ${k < done ? 'on' : ''}`} />)}
                </span>
              )}
            </button>
          );
        })}
      </section>

      <section className="activity-row" aria-label="activities">
        <button className="activity" onClick={() => navigate('/words')} data-testid="menu-words">
          <span className="emoji" aria-hidden>⭐</span>
          <span lang="ar">كَلِمَاتِي</span>
          {wordCount > 0 && <span className="count">{wordCount}</span>}
        </button>
        <button className="activity" onClick={() => navigate('/stories')} data-testid="menu-stories">
          <span className="emoji" aria-hidden>📖</span>
          <span lang="ar">قِصَّةُ حَرْفٍ</span>
          {storyCount > 0 && <span className="count">{storyCount}</span>}
        </button>
        <button className="activity" onClick={() => navigate('/build')} data-testid="menu-build">
          <span className="emoji" aria-hidden>🧩</span>
          <span lang="ar">تَرْكِيبُ كَلِمَةٍ</span>
        </button>
      </section>

      <section className="center" style={{ gap: 12 }} aria-label="levels">
        <LevelCard
          emoji="🎵" title="حُرُوفُ الْمَدِّ" testId="level-long" unlocked={longUnlocked}
          progress={longUnlocked ? longMastered.size / Math.max(1, mastered.size) : mastered.size / CURRICULUM_RULES.longVowelUnlockLetters}
          onClick={() => navigate('/long')}
        />
        <LevelCard
          emoji="📝" title="جُمَلٌ" testId="level-sentences" unlocked={sentencesUnlocked}
          progress={Object.keys(state.sentencesRead).length / SENTENCES.length}
          onClick={() => navigate('/sentences')}
        />
        <LevelCard
          emoji="📚" title="قِصَصٌ قَصِيرَةٌ" testId="level-mini" unlocked={miniUnlocked}
          progress={Object.keys(state.miniStoriesRead).length / MINI_STORIES.length}
          onClick={() => navigate('/mini-stories')}
        />
      </section>
    </main>
  );
}

function LevelCard({ emoji, title, unlocked, progress, onClick, testId }: { emoji: string; title: string; unlocked: boolean; progress: number; onClick: () => void; testId: string }) {
  return (
    <button className={`level-card ${unlocked ? '' : 'locked'}`} onClick={onClick} data-testid={testId} data-unlocked={unlocked}>
      <span className="emoji" aria-hidden>{emoji}</span>
      <span className="grow">
        <span lang="ar">{title}</span>
        <span className="bar"><span style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }} /></span>
      </span>
      <span style={{ fontSize: 32 }} aria-hidden>{unlocked ? '⬅️' : '🔒'}</span>
    </button>
  );
}

function ChooseLetterTitle() {
  const player = useAudioPlayer();
  const ins = instruction('choose_letter');
  return (
    <div className="instruction" style={{ gap: 12 }}>
      <h1 className="title" lang="ar" data-testid="home-title">{ins.text}</h1>
      <button className="speak-mini" aria-label="hear instruction" onClick={() => player.play(ins)}>
        {player.status === 'unavailable' ? '🔇' : '🔈'}
      </button>
    </div>
  );
}
