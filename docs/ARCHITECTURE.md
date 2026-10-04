# Architecture

React 19 + TypeScript + Vite, delivered as a static PWA (works offline after the first visit, installable on phones and tablets). Routing uses hash URLs (`#/letter/meem`), so it can be hosted on any static server.

```
┌──────────── UI (src/ui) ────────────┐   screens + components; no curriculum rules inside
│ Home · LetterLesson · Build · Words │
│ Stories · LongVowels · Sentences    │
│ Progress · Calibration              │
└───────┬───────────────┬─────────────┘
        │               │
┌───────▼──────┐ ┌──────▼──────────────────────────────┐
│ curriculum/  │ │ services/                            │
│  content     │ │  audio/         AudioService         │
│  eligibility │ │  pronunciation/ Recorder, engines    │
│  activities  │ │  progress/      Store, Repository    │
│  levels      │ └──────────────────────────────────────┘
│  arabic      │
└───────┬──────┘
┌───────▼──────┐
│  data/*.json │  curriculum content (teacher-editable)
└──────────────┘
```

## Data model (`src/curriculum/types.ts`)

- **Letter** `{ id, char, name, consonant, forms[3], longForms[3] }`
- **VowelledSound** `{ id: "meem_a", letterId, text: "مَ", vowel: "fatha", length: "short", phonemes: "ma", audio: "phonemes/meem_a.mp3" }`. Long forms have ids `meem_aa / meem_ii / meem_uu`, text `مَا / مِي / مُو`, and their own audio. Short and long forms never share text, phonemes or audio.
- **DecodableWord** `{ id, word: "كَتَبَ", segments: ["كَ","تَ","بَ"], requiredLetters: ["ك","ت","ب"], level: 1|2, translit, gloss, emoji, audio }`
- **Story** `{ letter, letterId, title, sentences[3], audio, sentenceAudio[3] }`
- **Sentence** `{ id, text, words, requiredLetters, picture, distractors[2], audio, gloss }`
- **MiniStory** `{ id, sentenceIds[3], requiredLetters, emoji }`
- **MasteryState** = `ProgressState` (`src/services/progress/model.ts`): completed forms, discrimination and pronunciation counters, the last 300 `PronunciationAttempt`s, words built/analysed, stories, sentences and mini stories. A letter is **mastered** when all three short forms are complete. This is *derived*, never stored separately, so it cannot get out of sync.

## The mastered-letter rule

`src/curriculum/eligibility.ts` is the only gate for content:

- `isWordEligible(word, mastered)` is true only if **every** required base letter is mastered (hamza seats أ إ آ ء ؤ ئ count as أ; ة counts as ت).
- `isLongWordEligible` also requires the long-vowel lesson for each long segment's letter.
- `isSentenceEligible`, `isStoryEligible` (the story's letter is mastered), `eligibleMiniStories`.
- `masteredShortSounds / masteredLongSounds` are the only sources for word-bank tiles and analysis distractors.

Screens snapshot eligibility when they open, and deep links (`#/stories/kaaf`, `#/long/meem`) are guarded too. A randomised test checks 300 random mastered-letter sets and confirms nothing ineligible is ever returned.

`segmentWord()` rejects any letter without exactly one short vowel. So a word with sukun, shadda or tanween cannot even load into a decoding activity until the segmenter is extended for that level.

## Levels and progression (`src/curriculum/levels.ts`)

| Level | Status | Unlock |
|---|---|---|
| Short vowels | ✅ | always |
| حُرُوفُ الْمَدِّ | ✅ | 8 letters mastered (`CURRICULUM_RULES.longVowelUnlockLetters`) |
| Sentences | ✅ | 5 different words built/analysed + at least one eligible sentence |
| Mini stories | ✅ | 3 sentences read |
| السُّكُون، الشَّدَّة، التَّنْوِين، اللَّام الشَّمْسِيَّة وَالْقَمَرِيَّة | 🕓 planned | defined with prerequisites, not yet taught |

### Adding a later level (e.g. السُّكُون)

1. Extend `segmentWord` to accept `consonant + SUKUN` as a closed-syllable segment, behind a level flag so Level 1/2 content still rejects it.
2. Add the sounds to the data model (e.g. a `sukunForms` entry or a `Segment.kind`), with audio paths.
3. Add words with `level: 3` to `words.json` and an `eligibleSukunWords()` that also requires the sukun lesson.
4. Add a lesson screen reusing `ListenStep`, `DiscriminationStep` and `PronunciationStep` (sukun has no vowel nucleus, so it needs a remote/phoneme engine or a new local check).
5. Set `implemented: true` in `LEVELS` and add the unlock selector. Add data tests like the existing ones.

## Audio (`src/services/audio/audioService.ts`)

Recording first, dev-only Arabic TTS second, an explicit "unavailable" state third. See `AUDIO.md`.

## Pronunciation (`src/services/pronunciation/`)

`PronunciationService` interface → `LocalVowelEngine` (default) or `RemotePronunciationEngine` (when `VITE_PRONUNCIATION_ENDPOINT` is set). `HoldRecorder` keeps the mic open while a recording screen is showing, so press-and-hold starts instantly. See `PRONUNCIATION.md`.

## Persistence and cloud sync

`ProgressRepository { load(); save(state) }`. The prototype uses `LocalStorageRepository` (survives closing the app; corrupt data falls back safely). For accounts, implement the same interface over an authenticated API, keyed by child profile:

- keep localStorage as an offline cache and sync when online;
- merge by union (completed forms/words/stories are monotonic; counters take the max) — no destructive overwrite;
- store children's data in a region and under a policy that meets the school's requirements (UAE PDPL / GDPR); no voice recordings are stored by the app.

## Error handling

- `ErrorBoundary` around all routes → friendly screen + home button, never blank.
- Unknown routes → a "not found" screen with home/back.
- Every screen has 🏠 and ➡️ (back) buttons.
- Empty states: `تَعَلَّمْ حُرُوفًا أَكْثَرَ أَوَّلًا 🌟`.
- Loading: microphone start-up (🎤 ⏳), speakers pulse while playing.
- Audio failure: 🔇 + الصَّوْتُ غَيْرُ مُتَاحٍ + 🔁.

## Fonts and RTL

The whole app is `dir="rtl" lang="ar"`. Reading targets use **Noto Naskh Arabic** (clear, school-style Naskh with well-placed harakat) with generous line height and padding, so diacritics above and below are never clipped. UI text uses **Baloo Bhaijaan 2** (rounded and friendly). Both are bundled locally (`@fontsource`), so the app works offline.
