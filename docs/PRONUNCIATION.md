# Pronunciation assessment

## The rule

The app **never fakes success**. A recording is only marked ✅ صَحِيحٌ when an engine actually measured it and found it matched. Every other outcome keeps the child on the same sound:

| Outcome | Child sees | Counted as an attempt? |
|---|---|---|
| `correct` | ✅ صَحِيحٌ! ⭐ + **التَّالِي** | yes |
| `incorrect` (wrong vowel, unclear, too long, too short) | 🔄 حَاوِلْ مَرَّةً أُخْرَى + 🎤 إِعَادَةُ التَّسْجِيلِ (plus قُلْهُ قَصِيرًا / مُدَّ الصَّوْتَ hints) | yes |
| `no_speech` (silence, too quiet, too short) | 👂 لَمْ أَسْمَعْكَ جَيِّدًا + re-record | yes |
| `unavailable` (engine/service error) | ⚠️ خِدْمَةُ التَّقْيِيمِ غَيْرُ مُتَاحَةٍ الْآنَ + an English note for adults | no — logged only |

Microphone problems (blocked permission, no device, not HTTPS) show simple instructions for the grown-up and a 🔁 retry.

## Interaction

WhatsApp-style: press and **hold** 🎤 → recording starts; release → it stops and is assessed. A quick tap (under 0.35 s) is not scored; it shows اِضْغَطْ مُطَوَّلًا. Recordings stop automatically after 6 s. The child can also play back their own voice (🔁 اِسْتَمِعْ إِلَى صَوْتِكَ).

## Engine 1 — on-device vowel engine (default)

`src/services/pronunciation/vowelAnalysis.ts`, no network and no third-party service, so there is no chance of a speech-to-text system "correcting away" the short vowels.

1. Captures raw PCM from the microphone (no lossy codec).
2. Finds the voiced syllable (energy + pitch periodicity) and its **vowel nucleus**, which drops the consonant murmur (e.g. the م of مَ).
3. Measures the formants **F1, F2** with LPC (Levinson–Durbin, polynomial roots) and the pitch **F0** over the steady part of the vowel.
4. Converts to **speaker-normalised Bark differences** (Syrdal & Gopal): `z1 = B(F1) − B(F0)` (vowel height) and `z2 = B(F2) − B(F1)` (front/back). This is what lets one model work for a 4-year-old, a teacher and a parent.
   - فَتْحَة /a/: open → large z1
   - كَسْرَة /i/: close + front → small z1, large z2
   - ضَمَّة /u/: close + back → small z1, small z2
5. Nearest prototype wins, and it must win by a clear margin, otherwise the result is `unclear` (try again) — never a guess in the child's favour.
6. Measures **vowel length**: Level 1 rejects clearly stretched vowels (`> 700 ms`); Level 2 requires مَا/مِي/مُو to be held (`≥ 420 ms`), and strict short targets must be `≤ 360 ms`.

**What it verifies:** the vowel (فتحة/كسرة/ضمة) and its length (short/long).
**What it does not verify:** the consonant. If a child says /ba/ for مَ, the vowel is right, so it would pass. This is shown honestly in 📊 → System ("verifies vowel_quality, vowel_length"). For full consonant checking, connect Engine 2.

Sentence recordings are **not** scored by this engine (it is designed for single syllables). With the on-device engine, sentence recording is practice: the child records, listens back, and moves on to the picture question. Nothing is marked "correct".

### How it has been tested

`tests/unit/pronunciation.test.ts` (72 tests) uses a source–filter synthesiser with known ground truth:

- 4 voice types (adult man, adult woman, child, young child with F0 330 Hz) × fatha (front and back), kasra and damma × no onset / nasal onset (like م) / fricative onset (like س) → every case classified correctly.
- A full 3×3 matrix (child says X, target Y): correct only on the diagonal.
- Short vs long in both directions; wrong vowel quality with correct length is still wrong.
- Silence, white noise, a 40 ms blip and an empty buffer → never `correct`.
- Microphone sample rates 16k, 22.05k, 44.1k, 48k.

`tests/e2e` also pushes synthetic speech through the real browser pipeline (getUserMedia → recorder → engine → UI), including Chromium's own fake capture device.

**Important:** synthetic voices are not real children. Before release, validate with real FS2 voices using the calibration tool below.

### Calibration with real children (do this before release)

1. Open 📊 → *🎚️ Pronunciation calibration tool*.
2. For several children (boys and girls, native and non-native speakers), record each target مَ مِ مُ مَا مِي مُو 3–5 times. Also record deliberate mistakes (say مِ while مَ is selected).
3. Every matching recording should say `correct`; every mismatch `incorrect:wrong_vowel`; short/long mistakes `too_short` / `too_long`.
4. Press *Copy results (JSON)* and keep the data. If a group of voices is misjudged, adjust `src/services/pronunciation/config.ts` (`prototypes`, `scale`, `minConfidence`, length thresholds) and add those cases to the unit tests.

Classroom noise matters. Use the app in a quiet corner, and use a headset microphone if possible.

## Engine 2 — remote phoneme-level engine (recommended for production)

Set an endpoint at build time:

```bash
VITE_PRONUNCIATION_ENDPOINT=https://your-server.example/assess npm run build
```

The app then sends every attempt to that server instead (`src/services/pronunciation/remoteEngine.ts`).

### Remote engine API

`POST {endpoint}` as `multipart/form-data`:

- `audio` — 16 kHz mono 16-bit WAV of the attempt
- `target` — JSON, e.g.
  ```json
  { "id": "meem_a", "text": "مَ", "phonemes": "ma", "vowel": "fatha", "length": "short", "lengthMode": "short_lenient" }
  ```
  For sentences, `id` starts with `sentence:` and `phonemes` holds the vowelled words.

Response `200`:

```json
{ "status": "correct" | "incorrect" | "no_speech",
  "reason": "wrong_vowel" | "wrong_sound" | "too_long" | "too_short" | "unclear",
  "detected": "mi", "score": 0.82 }
```

A timeout (8 s), network error, non-200 status or unexpected body is treated as `unavailable` — never correct.

### Choosing the server model

- Use a model that outputs **phonemes, including short vowels**, such as a wav2vec2/XLS-R-style model fine-tuned for Arabic phoneme recognition, then compare its output with `target.phonemes` and measure vowel duration.
- Do **not** rely on plain Arabic speech-to-text: most systems output undiacritised text, so مَ, مِ and مُ all come out as "م".
- Commercial pronunciation-assessment APIs with Arabic support exist (for example in Microsoft Azure Speech). Check the current Arabic support, children's-voice accuracy and data-protection terms (children's voice data: UAE PDPL, GDPR, school policy) before using any of them.
- Whatever you choose must pass the same short-vowel test set: the 3×3 فتحة/كسرة/ضمة matrix and the short/long matrix, with real FS2 recordings.

Children's voice recordings are personal data. The on-device engine keeps all audio on the device; nothing is uploaded or stored.
