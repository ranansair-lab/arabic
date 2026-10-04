import { useState } from 'react';
import { LETTERS, SENTENCES, STORIES, WORDS } from '../../curriculum/content';
import { LEVELS } from '../../curriculum/levels';
import { eligibleLongWords, eligibleShortWords } from '../../curriculum/eligibility';
import { audioService } from '../../services/audio/audioService';
import { getPronunciationService } from '../../services/pronunciation';
import { badges, completedLongForms, completedShortForms, isLongVowelLevelUnlocked, isMiniStoryLevelUnlocked, isSentenceLevelUnlocked } from '../../services/progress/selectors';
import { useProgress } from '../hooks';
import { Screen } from '../components/Screen';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** 📊 Grown-ups' view (English + Arabic). No leaderboards, no comparison. */
export function ProgressScreen() {
  const { state, store, mastered, longMastered } = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const engine = getPronunciationService();
  const formsDone = LETTERS.reduce((n, l) => n + completedShortForms(state, l), 0);
  const longDone = LETTERS.reduce((n, l) => n + completedLongForms(state, l), 0);
  const unlocked: Record<string, boolean> = {
    short_vowels: true,
    long_vowels: isLongVowelLevelUnlocked(state),
    sentences: isSentenceLevelUnlocked(state),
    mini_stories: isMiniStoryLevelUnlocked(state),
  };
  const stats: [string, string][] = [
    ['Letters mastered', `${mastered.size} / ${LETTERS.length}`],
    ['Vowelled forms (short)', `${formsDone} / ${LETTERS.length * 3}`],
    ['Long-vowel forms', `${longDone} / ${LETTERS.length * 3}`],
    ['Listening (discrimination)', `${state.discrimination.correct} / ${state.discrimination.attempts} correct`],
    ['Pronunciation attempts', `${state.pronunciation.correct} / ${state.pronunciation.attempts} correct`],
    ['Words built', `${Object.keys(state.wordsBuilt).length} (available ${eligibleShortWords(mastered).length + eligibleLongWords(mastered, longMastered).length})`],
    ['Words analysed', `${Object.keys(state.wordsAnalysed).length}`],
    ['Stories completed', `${Object.keys(state.storiesCompleted).length} / ${STORIES.length}`],
    ['Sentences read', `${Object.keys(state.sentencesRead).length} / ${SENTENCES.length}`],
  ];
  const recent = state.attempts.slice(-12).reverse();

  return (
    <Screen testId="progress" backTo="/">
      <h1 className="title" lang="ar">📊 تَقَدُّمِي</h1>

      <div className="card">
        <div className="badges" data-testid="badges">
          {badges(state).map((b) => (
            <div key={b.id} className={`badge-card ${b.earned ? '' : 'off'}`} data-earned={b.earned}>
              <span className="e" aria-hidden>{b.emoji}</span>
              <span lang="ar">{b.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card parent">
        <h2>Letters</h2>
        <div className="mini-letters">
          {LETTERS.map((l) => (
            <div key={l.id} className={`mini-letter ${mastered.has(l.char) ? 'done' : ''}`} title={l.name}>
              {l.char}
              <div style={{ fontSize: 12, lineHeight: 1.2, fontFamily: 'system-ui' }}>
                {'●'.repeat(completedShortForms(state, l))}{'○'.repeat(3 - completedShortForms(state, l))}
                {longMastered.has(l.char) ? ' 🎵' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card parent">
        <h2>Summary</h2>
        <div className="stat-grid" data-testid="stats">
          {stats.map(([k, v]) => (
            <div key={k} className="stat"><span>{k}</span><b>{v}</b></div>
          ))}
        </div>
        <p>Short-vowel level: {pct(formsDone, LETTERS.length * 3)}%</p>
        <div className="bar"><span style={{ width: `${pct(formsDone, LETTERS.length * 3)}%` }} /></div>
      </div>

      <div className="card parent">
        <h2>Levels</h2>
        <table>
          <tbody>
            {LEVELS.map((lv) => (
              <tr key={lv.id}>
                <td className="ar">{lv.emoji} {lv.title}</td>
                <td>{lv.implemented ? (unlocked[lv.id] ? '✅ open' : '🔒 locked') : '🕓 planned'}</td>
                <td>{lv.unlockRule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card parent">
        <h2>Recent pronunciation attempts</h2>
        {recent.length === 0 ? <p>None yet.</p> : (
          <table>
            <thead><tr><th>Target</th><th>Result</th><th>Heard</th></tr></thead>
            <tbody>
              {recent.map((a, i) => (
                <tr key={i}><td className="ar">{a.targetText}</td><td>{a.outcome}</td><td>{a.detected ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card parent" data-testid="system-info">
        <h2>System</h2>
        <p>Pronunciation engine: <b>{engine.name}</b> — verifies {engine.verifies.join(', ')}.</p>
        <p>Validated recordings installed: <b>{audioService.recordedCount()}</b>{audioService.devTtsAllowed ? ' — development TTS fallback is ON (not for release).' : '.'}</p>
        <p><a href="#/calibrate" data-testid="calibrate-link">🎚️ Pronunciation calibration tool (teachers)</a></p>
        <p>Content: {LETTERS.length} letters, {WORDS.length} words, {STORIES.length} stories, {SENTENCES.length} sentences.</p>
        {!confirmReset ? (
          <button className="danger" onClick={() => setConfirmReset(true)} data-testid="reset">Reset progress…</button>
        ) : (
          <p>
            Delete all progress on this device?{' '}
            <button className="danger" onClick={() => { store.reset(); setConfirmReset(false); }} data-testid="reset-confirm">Yes, reset</button>{' '}
            <button className="btn white" style={{ minHeight: 44, fontSize: 16 }} onClick={() => setConfirmReset(false)}>Cancel</button>
          </p>
        )}
      </div>
    </Screen>
  );
}
