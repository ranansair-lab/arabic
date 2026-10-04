# أَقْرَأُ مَعَ الْحُرُوفِ — Arabic Early Reading (FS2, ages 4–5)

A web app (installable PWA, mobile-first, fully RTL) that teaches beginner Arabic reading step by step:

1. Letter sounds with short vowels — فَتْحَة، كَسْرَة، ضَمَّة (Level 1)
2. Blending vowelled letters
3. Building and reading words (🧩 تَرْكِيبُ كَلِمَةٍ, ⭐ كَلِمَاتِي)
4. Long vowels — حُرُوفُ الْمَدِّ (Level 2, kept completely separate and locked until the foundation is in place)
5. Short decodable sentences
6. Very short decodable stories
7. A three-sentence listening story for every letter (📖 قِصَّةُ حَرْفٍ)

It is built for young children and for children learning Arabic as an additional language.

---

## Quick start

Requires Node 20+.

```bash
npm install
npm run dev            # http://localhost:5173  (development: Arabic TTS fallback allowed)
```

Production build (what children use: **no** TTS fallback):

```bash
npm run build          # → dist/   (static files; host anywhere, e.g. Netlify, Vercel, school server)
npm run preview        # serve dist/ at http://localhost:4173
```

Preview build for demos *before* native recordings exist (shows a "DEV AUDIO" badge):

```bash
npm run build:preview
```

> The microphone only works on `https://` or `localhost`.

### Tests

```bash
npm test               # 238 unit tests: curriculum data, eligibility rule, pronunciation engine, progress
npm run test:e2e       # 24 browser tests on a phone viewport: every flow in the spec (TEST 1–12) and more
```

See [docs/TEST-RESULTS.md](docs/TEST-RESULTS.md) for the latest results.

---

## What the child sees

- **Home** — `اِخْتَرْ حَرْفًا لِتَتَعَلَّمَهُ` and all 28 letters. Any letter can be chosen in any order; nothing is locked. Mastered letters show ✓ and ⭐; letters in progress show small dots. Below: ⭐ كَلِمَاتِي · 📖 قِصَّةُ حَرْفٍ · 🧩 تَرْكِيبُ كَلِمَةٍ, then the level cards.
- **Letter lesson** — مَ alone → listen → *أَيُّ صَوْتٍ سَمِعْتَ؟* → press-and-hold recording → real assessment. Then مِ, then مُ. Then ⭐⭐⭐ *أَحْسَنْتَ! أَتْمَمْتَ حَرْفَ م* → *اِخْتَرْ حَرْفًا آخَرَ* (back to the free choice screen).
- **🧩 تَرْكِيبُ كَلِمَةٍ** — audio first; empty slots; a bank of sounds from mastered letters only; *تَحَقَّقْ*; success animation كَ تَ بَ → كَتَبَ; then it moves on automatically.
- **⭐ كَلِمَاتِي** — a fully vowelled word, 🔊, "first / middle / last sound?", then كَ + تَ + بَ.
- **📖 قِصَّةُ حَرْفٍ** — stories for mastered letters only; listen; *مَا أَكْثَرُ حَرْفٍ سَمِعْتَ؟*
- **🎵 حُرُوفُ الْمَدِّ** — unlocks after 8 letters. مَ → مَا with short/long duration bars, blending مَ + ا = مَا, short-vs-long discrimination, and long-vowel pronunciation (length is measured).
- **📝 جُمَلٌ / 📚 قِصَصٌ قَصِيرَةٌ** — unlock after word practice; one sentence per screen, audio, recording, picture choice.
- **📊 (grown-ups)** — progress, badges, recent attempts, level status, system info, calibration tool, reset.

## The non-negotiable rules (all enforced in code and by tests)

| Rule | Where |
|---|---|
| Diacritics are never stripped from anything shown | `ArabicText` renders text verbatim; `segmentWord` rejects un-vowelled letters |
| Short ≠ long: مَ ≠ مَا (different text, audio and phonemes) | `src/data/letters.json`, tests in `tests/unit/curriculum.test.ts` |
| Level 1 words contain no حروف المد, sukun, shadda or tanween | data tests |
| Only mastered letters in words, banks, distractors, sentences; stories only for mastered letters | `src/curriculum/eligibility.ts` (+ randomised test over 300 letter sets; deep links guarded) |
| Pronunciation success is never faked; service failures say so | `src/services/pronunciation/*`, tests |
| No forced alphabetical order | home screen + TEST 7 |

## Project structure

```
src/
  data/                 ← curriculum content (JSON, editable)
    letters.json        28 letters × (3 short + 3 long) vowelled forms
    words.json          66 short-vowel words + 22 long-vowel words, with segments
    stories.json        28 three-sentence letter stories
    sentences.json      13 decodable sentences with picture choices
    mini-stories.json   4 decodable mini stories
    instructions.json   every spoken/written instruction
  curriculum/           ← pure logic, no UI
    arabic.ts           Unicode helpers, segmenter, letter counting
    eligibility.ts      THE mastered-letter rule (isWordEligible …)
    activities.ts       choice/bank/question generators
    levels.ts           progression + unlock thresholds
    types.ts            Letter, VowelledSound, DecodableWord, Story, Sentence, PronunciationAttempt …
  services/
    audio/              recorded-file playback, dev-only TTS fallback
    pronunciation/      recorder, on-device vowel engine, remote engine adapter
    progress/           model, repository (localStorage), store, selectors, badges
  ui/                   components + screens (no curriculum logic inside)
public/audio/           phonemes/ words/ stories/ instructions/ sentences/  + manifest.json
scripts/                audio manifest + recording checklist
docs/                   architecture, audio, pronunciation, curriculum, test results
tests/unit, tests/e2e
```

## Documentation

- [docs/AUDIO.md](docs/AUDIO.md) — **replacing temporary audio with validated native MSA recordings** (step by step)
- [docs/PRONUNCIATION.md](docs/PRONUNCIATION.md) — how assessment works, what it checks, calibration, remote engine API
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules, data model, adding السكون/الشدة/التنوين/اللام, cloud sync
- [docs/CURRICULUM.md](docs/CURRICULUM.md) — editing words, stories and sentences safely
- [docs/audio-checklist.csv](docs/audio-checklist.csv) — every clip to record (409), with exact vowelled text

## Before giving it to children — release checklist

1. Record and review all audio (see `docs/AUDIO.md`). The production build plays **only** validated recordings.
2. Run the calibration tool (📊 → 🎚️) with a group of real FS2 children and confirm مَ/مِ/مُ and مَ/مَا are judged correctly; tune `src/services/pronunciation/config.ts` if needed (see `docs/PRONUNCIATION.md`). Consider connecting a server-side phoneme model so consonants are checked too.
3. Have an Arabic specialist review the stories and word list.
4. `npm test && npm run test:e2e`, then `npm run build` and deploy `dist/` over HTTPS.
