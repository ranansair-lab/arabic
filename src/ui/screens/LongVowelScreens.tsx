import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLetter, getLetterByChar, instruction, LETTERS } from '../../curriculum/content';
import { CURRICULUM_RULES } from '../../curriculum/levels';
import { longDiscriminationChoices } from '../../curriculum/activities';
import { MADD_LETTER } from '../../curriculum/arabic';
import type { Letter, VowelledSound } from '../../curriculum/types';
import type { PronunciationTarget } from '../../services/pronunciation';
import { completedLongForms, isLetterMastered, isLongVowelLevelUnlocked } from '../../services/progress/selectors';
import { useProgress } from '../hooks';
import { Screen } from '../components/Screen';
import { ArabicText } from '../components/ArabicText';
import { EmptyState } from '../components/EmptyState';
import { Confetti, Feedback, Praise, Stars } from '../components/Feedback';
import { Instruction, Speaker } from '../components/Speaker';
import { clipOf, DiscriminationStep } from '../components/LessonSteps';
import { PronunciationStep } from '../components/PronunciationStep';
import { NotFoundScreen } from './NotFoundScreen';

const COLORS = ['var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c4)'];

/** Level 2 hub: locked until the short-vowel foundation is in place. */
export function LongVowelHomeScreen() {
  const navigate = useNavigate();
  const { state, mastered } = useProgress();
  if (!isLongVowelLevelUnlocked(state)) {
    return (
      <Screen testId="long-home" backTo="/">
        <div className="card center" data-testid="long-locked">
          <div style={{ fontSize: 70 }} aria-hidden>🔒🎵</div>
          <p className="title" lang="ar">{instruction('learn_more').text} 🌟</p>
          <div className="bar" style={{ width: '80%' }}>
            <span style={{ width: `${(mastered.size / CURRICULUM_RULES.longVowelUnlockLetters) * 100}%` }} />
          </div>
          <p className="parent" style={{ textAlign: 'center' }}>
            Long vowels (حروف المد) open after {CURRICULUM_RULES.longVowelUnlockLetters} short-vowel letters are mastered ({mastered.size}/{CURRICULUM_RULES.longVowelUnlockLetters}).
          </p>
          <button className="btn" onClick={() => navigate('/')}>🔤</button>
        </div>
      </Screen>
    );
  }
  const letters = LETTERS.filter((l) => isLetterMastered(state, l));
  const demo = getLetterByChar('م') && mastered.has('م') ? getLetterByChar('م')! : letters[0];
  return (
    <Screen testId="long-home" backTo="/">
      <h1 className="title" lang="ar">🎵 حُرُوفُ الْمَدِّ</h1>
      <ContrastCard letter={demo} />
      <p className="title" lang="ar" style={{ fontSize: 28 }}>{instruction('choose_letter').text}</p>
      <div className="letter-grid" data-testid="long-letter-grid">
        {letters.map((l, i) => {
          const done = completedLongForms(state, l);
          const full = done === l.longForms.length;
          return (
            <button key={l.id} className={`letter-tile ${full ? 'mastered' : ''}`} style={{ background: COLORS[i % COLORS.length] }}
              onClick={() => navigate(`/long/${l.id}`)} data-testid={`long-letter-${l.id}`} data-mastered={full} lang="ar">
              {l.char}
              {full && <span className="badge">✓</span>}
              {full && <span className="star" aria-hidden>⭐</span>}
              {!full && done > 0 && (
                <span className="pips" aria-hidden>{l.longForms.map((f, k) => <span key={f.id} className={`pip ${k < done ? 'on' : ''}`} />)}</span>
              )}
            </button>
          );
        })}
      </div>
      <button className="activity" style={{ width: '100%' }} onClick={() => navigate('/long/build')} data-testid="long-build">
        <span className="emoji" aria-hidden>🧩</span>
        <span lang="ar">تَرْكِيبُ كَلِمَةٍ</span>
      </button>
    </Screen>
  );
}

/** مَ → مَا : short (one beat) vs long (two beats), shown with duration bars. */
function ContrastCard({ letter, index }: { letter: Letter; index?: number }) {
  const pairs = index === undefined ? [0, 1, 2] : [index];
  return (
    <div className="card center" style={{ width: '100%', gap: 8 }} data-testid="contrast">
      {pairs.map((k) => (
        <div key={k} className="contrast">
          <div className="center" style={{ gap: 4 }}>
            <ArabicText text={letter.forms[k].text} size="m" testId="contrast-short" />
            <div className="duration short" aria-label="short" />
            <Speaker clip={clipOf(letter.forms[k])} small testId="contrast-short-audio" />
          </div>
          <span className="arrow" aria-hidden>⬅️</span>
          <div className="center" style={{ gap: 4 }}>
            <ArabicText text={letter.longForms[k].text} size="m" testId="contrast-long" />
            <div className="duration long" aria-label="long" />
            <Speaker clip={clipOf(letter.longForms[k])} small testId="contrast-long-audio" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LongLessonScreen() {
  const { letterId = '' } = useParams();
  const { state } = useProgress();
  const letter = getLetter(letterId);
  if (!letter) return <NotFoundScreen />;
  // Long vowels only for letters already mastered with short vowels.
  if (!isLongVowelLevelUnlocked(state) || !isLetterMastered(state, letter)) {
    return <Screen testId="long-lesson" backTo="/long"><EmptyState /></Screen>;
  }
  return <LongLesson key={letter.id} letter={letter} />;
}

export function longTarget(sound: VowelledSound): PronunciationTarget {
  return { id: sound.id, text: sound.text, phonemes: sound.phonemes, vowel: sound.vowel, length: 'long', lengthMode: 'long' };
}

type Step = 'contrast' | 'blend' | 'discriminate_long' | 'discriminate_short' | 'pronounce';

/** For each vowel: hear the contrast → see the blend → discriminate (long AND short) → say the long sound. */
function LongLesson({ letter }: { letter: Letter }) {
  const navigate = useNavigate();
  const { state, store } = useProgress();
  const firstOpen = letter.longForms.findIndex((f) => !state.completedForms[f.id]);
  const [k, setK] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [step, setStep] = useState<Step>('contrast');
  const [complete, setComplete] = useState(false);
  const long = letter.longForms[k];
  const short = letter.forms[k];
  const choices = useMemo(() => longDiscriminationChoices(letter, long), [letter, long]);
  // Ask long and short in random order so the answer is not always "long".
  const longFirst = useMemo(() => Math.random() < 0.5, [k]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => {
    store.completeForm(long.id);
    if (k < 2) { setK(k + 1); setStep('contrast'); } else setComplete(true);
  };

  if (complete) {
    return (
      <Screen testId="long-complete" backTo="/long">
        <Confetti />
        <div className="card center">
          <Stars n={3} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {letter.longForms.map((f) => <ArabicText key={f.id} text={f.text} size="m" />)}
          </div>
          <p className="title" lang="ar">{instruction('well_done').text}<br />{instruction('letter_complete').text}</p>
          <button className="btn green wide" onClick={() => navigate('/long')} data-testid="choose-another">
            <span lang="ar">{instruction('choose_another').text}</span>
          </button>
        </div>
      </Screen>
    );
  }

  const first: Step = longFirst ? 'discriminate_long' : 'discriminate_short';
  const second: Step = longFirst ? 'discriminate_short' : 'discriminate_long';

  return (
    <Screen testId="long-lesson" backTo="/long">
      {step === 'contrast' && (
        <section className="center" data-testid="step-contrast">
          <Instruction id="listen_carefully" icon="👂" />
          <ContrastCard letter={letter} index={k} />
          <button className="btn green wide" onClick={() => setStep('blend')} data-testid="next"><span lang="ar">التَّالِي</span></button>
        </section>
      )}
      {step === 'blend' && <BlendStep short={short} long={long} onNext={() => setStep(first)} />}
      {(step === 'discriminate_long' || step === 'discriminate_short') && (
        <>
          <Instruction id="short_or_long" icon="📏" />
          <DiscriminationStep
            key={step}
            testId="step-discriminate"
            target={step === 'discriminate_long' ? long : short}
            choices={choices}
            onCorrect={() => setStep(step === first ? second : 'pronounce')}
          />
        </>
      )}
      {step === 'pronounce' && (
        <PronunciationStep key={long.id} target={longTarget(long)} clip={clipOf(long)} onCorrect={finish} />
      )}
    </Screen>
  );
}

/** مَ + ا = مَا — the madd letter visibly joins and lengthens the sound. */
function BlendStep({ short, long, onNext }: { short: VowelledSound; long: VowelledSound; onNext: () => void }) {
  const [joined, setJoined] = useState(false);
  const madd = short.letterId === 'alif' && short.vowel === 'fatha' ? 'ا' : MADD_LETTER[short.vowel];
  return (
    <section className="center" data-testid="step-blend">
      <div className="card center" style={{ width: '100%' }}>
        {!joined ? (
          <div className="assemble close" style={{ gap: 18 }}>
            <ArabicText text={short.text} size="l" />
            <span className="plus">+</span>
            <ArabicText text={madd} size="l" />
          </div>
        ) : (
          <ArabicText text={long.text} size="l" testId="blend-result" />
        )}
        {joined && <Feedback kind="ok"><Praise /></Feedback>}
      </div>
      <Speaker clip={clipOf(joined ? long : short)} small autoPlay={joined} testId="blend-audio" />
      {!joined ? (
        <button className="btn blue wide" onClick={() => setJoined(true)} data-testid="blend">
          🧲 <span lang="ar">=</span>
        </button>
      ) : (
        <button className="btn green wide" onClick={onNext} data-testid="next"><span lang="ar">التَّالِي</span></button>
      )}
    </section>
  );
}
