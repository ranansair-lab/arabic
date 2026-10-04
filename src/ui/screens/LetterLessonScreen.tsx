import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLetter, instruction } from '../../curriculum/content';
import { shortDiscriminationChoices } from '../../curriculum/activities';
import type { Letter, VowelledSound } from '../../curriculum/types';
import type { PronunciationTarget } from '../../services/pronunciation';
import { useProgress } from '../hooks';
import { Screen } from '../components/Screen';
import { ArabicText } from '../components/ArabicText';
import { Confetti, Stars } from '../components/Feedback';
import { clipOf, DiscriminationStep, ListenStep } from '../components/LessonSteps';
import { PronunciationStep } from '../components/PronunciationStep';
import { NotFoundScreen } from './NotFoundScreen';

type Step = 'listen' | 'discriminate' | 'pronounce';

export function LetterLessonScreen() {
  const { letterId = '' } = useParams();
  const letter = getLetter(letterId);
  if (!letter) return <NotFoundScreen />;
  return <LetterLesson key={letter.id} letter={letter} />;
}

export function shortTarget(sound: VowelledSound): PronunciationTarget {
  return { id: sound.id, text: sound.text, phonemes: sound.phonemes, vowel: sound.vowel, length: 'short', lengthMode: 'short_lenient' };
}

/**
 * Teaches مَ, then مِ, then مُ — one at a time, each through
 * listen → discriminate → pronounce. Resumes at the first unfinished form.
 */
function LetterLesson({ letter }: { letter: Letter }) {
  const navigate = useNavigate();
  const { state, store } = useProgress();
  const firstOpen = letter.forms.findIndex((f) => !state.completedForms[f.id]);
  const [formIndex, setFormIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [step, setStep] = useState<Step>('listen');
  const [complete, setComplete] = useState(false);
  const sound = letter.forms[formIndex];
  const choices = useMemo(() => shortDiscriminationChoices(letter), [letter, formIndex]);

  const finishForm = () => {
    store.completeForm(sound.id);
    if (formIndex < letter.forms.length - 1) {
      setFormIndex(formIndex + 1);
      setStep('listen');
    } else {
      setComplete(true);
    }
  };

  if (complete) {
    return (
      <Screen testId="letter-complete" backTo="/">
        <Confetti />
        <div className="card center">
          <Stars n={3} />
          <div className="center" style={{ gap: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
            {letter.forms.map((f) => (
              <span key={f.id} style={{ margin: '0 10px' }}><ArabicText text={f.text} size="m" /> <span aria-hidden>✓</span></span>
            ))}
          </div>
          <p className="title" lang="ar" data-testid="complete-message">أَحْسَنْتَ!<br />أَتْمَمْتَ حَرْفَ {letter.char}</p>
          <button className="btn green wide" onClick={() => navigate('/')} data-testid="choose-another">
            <span lang="ar">{instruction('choose_another').text}</span> <span aria-hidden>🔤</span>
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen testId="letter-lesson" backTo="/" right={<FormDots letter={letter} current={formIndex} completed={state.completedForms} />}>
      {step === 'listen' && <ListenStep key={`l-${sound.id}`} sound={sound} onNext={() => setStep('discriminate')} />}
      {step === 'discriminate' && (
        <DiscriminationStep key={`d-${sound.id}`} target={sound} choices={choices} onCorrect={() => setStep('pronounce')} />
      )}
      {step === 'pronounce' && (
        <PronunciationStep key={`p-${sound.id}`} target={shortTarget(sound)} clip={clipOf(sound)} onCorrect={finishForm} />
      )}
    </Screen>
  );
}

/** Progress pips only — the three forms are never shown together while teaching. */
function FormDots({ letter, current, completed }: { letter: Letter; current: number; completed: Record<string, string> }) {
  return (
    <span style={{ display: 'flex', gap: 8 }} aria-label="progress" data-testid="form-dots">
      {letter.forms.map((f, i) => (
        <span
          key={f.id}
          style={{
            width: 18, height: 18, borderRadius: '50%',
            background: completed[f.id] ? 'var(--ok)' : i === current ? 'var(--sun)' : 'rgba(35,50,74,.18)',
            border: '3px solid #fff',
          }}
        />
      ))}
    </span>
  );
}
