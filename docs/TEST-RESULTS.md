# Test results

Run on 3 October 2026 · Node 22.22 · Chromium (Playwright 1.56.1) · phone viewport (Pixel 7) · **production build** (no TTS fallback).

| Suite | Result |
|---|---|
| Unit — curriculum data, segmenter, eligibility, activity generators (`tests/unit/curriculum.test.ts`) | **154 / 154 passed** |
| Unit — pronunciation engine (`tests/unit/pronunciation.test.ts`) | **72 / 72 passed** |
| Unit — remote engine adapter (`tests/unit/remote-engine.test.ts`) | **6 / 6 passed** |
| Unit — progress store (`tests/unit/progress.test.ts`) | **6 / 6 passed** |
| End-to-end browser flows (`tests/e2e`) | **24 / 24 passed** (also stable across 3 repeated runs) |
| TypeScript strict type-check + production build | ✅ no errors |
| Runtime errors on every screen (new child and child with progress) | ✅ none |

## Mapping to the specification's tests

| Spec test | Covered by | Result |
|---|---|---|
| TEST 1 — choose م → مَ appears alone | `TEST 1 — choose م: مَ appears alone` (also checks مِ/مُ are *not* shown) | ✅ |
| TEST 2 — next → discrimination, never blank | `TEST 2 + 3 …` | ✅ |
| TEST 3 — choose مَ → recording screen | `TEST 2 + 3 …` (target stays vowelled) | ✅ |
| TEST 4 — hold & release → result; correct → صحيح → التالي; incorrect → إعادة التسجيل | `TEST 4 …` (مِ and مُ rejected for مَ, silence → لَمْ أَسْمَعْكَ, مَ accepted) and `real capture device …` | ✅ |
| TEST 5 — complete مَ → مِ → مُ | `TEST 5 + 6 …` | ✅ |
| TEST 6 — م gets ✓ on home (and persists after reload) | `TEST 5 + 6 …` | ✅ |
| TEST 7 — arbitrary letter, no alphabetical order | `TEST 7 — any letter in any order (ظ then أ)` (also checks أَ إِ أُ) | ✅ |
| TEST 8 — قصة حرف shows only mastered letters | `TEST 8 …` (+ deep link to an unlearned story refused) | ✅ |
| TEST 9 — كلماتي shows only fully mastered words | `TEST 9 …` (6 words; every word and every choice checked) | ✅ |
| TEST 10 — تركيب كلمة shows only eligible words | `TEST 10 + 11 …` (every bank tile checked) | ✅ |
| TEST 11 — success animation, audio, auto-advance | `TEST 10 + 11 …` (3 words in a row, no menu trip) | ✅ |
| TEST 12 — no eligible word → تَعَلَّمْ حُرُوفًا أَكْثَرَ أَوَّلًا | `TEST 12 …`, `TEST 12b …` | ✅ |

## All end-to-end tests

| | File | Test | Time |
|---|---|---|---|
| ✓ | `mastered-content.spec.ts` | Level 2 stays locked until 8 letters are mastered | 1.3s |
| ✓ | `mastered-content.spec.ts` | Level 2 — مَ → مَا: contrast, blend, short/long discrimination, long pronunciation | 10.9s |
| ✓ | `mastered-content.spec.ts` | Sentences: locked until words practised; then read, record, picture choice | 2.9s |
| ✓ | `mastered-content.spec.ts` | TEST 10 + 11 — تركيب كلمة: eligible words, success animation, auto-advance | 10.1s |
| ✓ | `mastered-content.spec.ts` | TEST 12 — no eligible content → friendly message everywhere | 1.4s |
| ✓ | `mastered-content.spec.ts` | TEST 12b — nothing mastered: stories empty too | 1.4s |
| ✓ | `mastered-content.spec.ts` | TEST 8 — قصة حرف shows only mastered letters | 1.4s |
| ✓ | `mastered-content.spec.ts` | TEST 9 — كلماتي: only fully-mastered words, analysis + segmentation | 3.3s |
| ✓ | `mastered-content.spec.ts` | progress screen shows tracked metrics and no leaderboard | 744ms |
| ✓ | `mastered-content.spec.ts` | story: listen, question, wrong → listen again, right → ⭐ | 2.0s |
| ✓ | `mastered-content.spec.ts` | word building: wrong order → listen again, not revealed | 4.7s |
| ✓ | `real-fake-device.spec.ts` | real capture device: /ma/ is accepted for مَ and rejected for مِ | 8.5s |
| ✓ | `runtime-errors.spec.ts` | no runtime errors on any screen (new child) | 8.4s |
| ✓ | `runtime-errors.spec.ts` | no runtime errors on any screen (with progress) | 8.3s |
| ✓ | `short-vowel-flow.spec.ts` | TEST 1 — choose م: مَ appears alone | 844ms |
| ✓ | `short-vowel-flow.spec.ts` | TEST 2 + 3 — next shows discrimination (never blank); choosing مَ opens recording | 2.8s |
| ✓ | `short-vowel-flow.spec.ts` | TEST 4 — hold & release: wrong vowel → retry, right vowel → صحيح → التالي | 8.1s |
| ✓ | `short-vowel-flow.spec.ts` | TEST 5 + 6 — مَ then مِ then مُ; م gets ✓ on home | 11.6s |
| ✓ | `short-vowel-flow.spec.ts` | TEST 7 — any letter in any order (ظ then أ) | 21.7s |
| ✓ | `short-vowel-flow.spec.ts` | a lesson resumes at the first unfinished form | 4.4s |
| ✓ | `short-vowel-flow.spec.ts` | a quick tap (not a hold) does not record or score | 2.9s |
| ✓ | `short-vowel-flow.spec.ts` | audio missing in production → visible "audio unavailable" state, flow continues | 842ms |
| ✓ | `short-vowel-flow.spec.ts` | back/home navigation from every main screen | 2.2s |
| ✓ | `short-vowel-flow.spec.ts` | microphone denied → simple instructions, retry, never marked correct | 4.4s |

## What these tests do *not* prove

- **Real children's voices.** The pronunciation engine is tested with synthetic voices (man, woman, child, young child) through both a pure-function path and the real browser recording path. Accuracy with real FS2 children in a real classroom must be confirmed with the calibration tool (`docs/PRONUNCIATION.md`) before release.
- **Consonant accuracy.** The on-device engine checks the vowel and its length, not the consonant (see `docs/PRONUNCIATION.md`).
- **Native audio quality.** No recordings are bundled yet; tests confirm that a missing recording shows the "audio unavailable" state instead of failing silently.
- **Safari/iOS.** The automated tests run in Chromium. Recording uses standard Web Audio APIs that Safari supports, but please check on a real iPad/iPhone.
