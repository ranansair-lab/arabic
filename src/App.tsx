import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { audioService } from './services/audio/audioService';
import { ErrorBoundary } from './ui/components/StateViews';
import { HomeScreen } from './ui/screens/HomeScreen';
import { LetterLessonScreen } from './ui/screens/LetterLessonScreen';
import { BuildScreen } from './ui/screens/BuildScreen';
import { WordsScreen } from './ui/screens/WordsScreen';
import { StoriesListScreen, StoryScreen } from './ui/screens/StoriesScreen';
import { LongLessonScreen, LongVowelHomeScreen } from './ui/screens/LongVowelScreens';
import { MiniStoriesScreen, MiniStoryScreen, SentencesScreen } from './ui/screens/SentenceScreens';
import { ProgressScreen } from './ui/screens/ProgressScreen';
import { NotFoundScreen } from './ui/screens/NotFoundScreen';
import { CalibrationScreen } from './ui/screens/CalibrationScreen';

function Scenery() {
  return (
    <div className="scenery" aria-hidden>
      <div className="sun" />
      <div className="cloud a" />
      <div className="cloud b" />
      <div className="hills" />
    </div>
  );
}

function DevAudioBadge() {
  const [used, setUsed] = useState(false);
  useEffect(() => audioService.onSourceUsed((src) => src === 'dev-tts' && setUsed(true)), []);
  if (!used) return null;
  return <div className="dev-badge" data-testid="dev-audio-badge">DEV AUDIO (TTS) — replace with native recordings</div>;
}

export function App() {
  useEffect(() => void audioService.init(), []);
  return (
    <HashRouter>
      <div className="app" dir="rtl" lang="ar">
        <Scenery />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/letter/:letterId" element={<LetterLessonScreen />} />
            <Route path="/words" element={<WordsScreen />} />
            <Route path="/build" element={<BuildScreen level={1} />} />
            <Route path="/stories" element={<StoriesListScreen />} />
            <Route path="/stories/:letterId" element={<StoryScreen />} />
            <Route path="/long" element={<LongVowelHomeScreen />} />
            <Route path="/long/build" element={<BuildScreen level={2} />} />
            <Route path="/long/:letterId" element={<LongLessonScreen />} />
            <Route path="/sentences" element={<SentencesScreen />} />
            <Route path="/mini-stories" element={<MiniStoriesScreen />} />
            <Route path="/mini-stories/:id" element={<MiniStoryScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/calibrate" element={<CalibrationScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </ErrorBoundary>
        <DevAudioBadge />
      </div>
    </HashRouter>
  );
}
