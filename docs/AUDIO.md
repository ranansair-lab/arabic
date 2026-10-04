# Audio: replacing temporary audio with validated native MSA recordings

## How audio works now

For every clip the app tries, in order:

1. **A recorded file** in `public/audio/…` that is listed in `public/audio/manifest.json`.
2. **Temporary browser TTS** — *only* when the build has `VITE_ALLOW_DEV_TTS=true` (`npm run dev`, `npm run build:preview`). It only uses a voice whose language is Arabic (`ar-*`); a foreign voice is never allowed to read Arabic. A "DEV AUDIO" badge appears whenever it is used.
3. Otherwise the speaker button turns grey (🔇) with **الصَّوْتُ غَيْرُ مُتَاحٍ** and a 🔁 retry. Activities still continue — nothing goes blank.

The production build (`npm run build`) **never** uses TTS. Browser TTS is not good enough for children learning sounds: it often reads مَ as the letter name "ميم" and does not pronounce isolated syllables reliably.

## Folder structure and file names

```
public/audio/
  phonemes/       meem_a.mp3   meem_i.mp3   meem_u.mp3      ← مَ مِ مُ   (Level 1)
                  meem_aa.mp3  meem_ii.mp3  meem_uu.mp3     ← مَا مِي مُو (Level 2)
  words/          kataba.mp3 …                              ← كَتَبَ …
  stories/        meem.mp3                                  ← whole story (3 sentences)
                  meem_1.mp3  meem_2.mp3  meem_3.mp3        ← optional, one per sentence (enables highlighting)
  sentences/      s01.mp3 …
  instructions/   listen_carefully.mp3 …                    ← اِسْتَمِعْ جَيِّدًا …
  manifest.json   (generated — do not edit by hand)
```

Letter ids: `alif baa taa thaa jeem hhaa khaa daal dhaal raa zaay seen sheen saad daad ttaa zhaa ain ghain faa qaaf kaaf laam meem noon haa waaw yaa` (ح = `hhaa`, ه = `haa`, ط = `ttaa`, ظ = `zhaa`).

The full list of **409 clips**, with the exact vowelled text to read and notes, is in **`docs/audio-checklist.csv`** (opens in Excel/Google Sheets; the last column shows whether each one is already recorded). Regenerate it at any time:

```bash
npm run audio:checklist
```

Any of `.mp3 .m4a .aac .ogg .opus .wav` works — the extension does not have to be `.mp3`.

## Recording guide (for the native MSA speaker)

- **Speaker**: a fluent Modern Standard Arabic speaker with clear, neutral فصحى pronunciation (an experienced Arabic teacher is ideal). One voice for all phonemes keeps things consistent for children.
- **Phonemes — say the SOUND, not the name.** For مَ say /ma/ — not "ميم فتحة". One clear syllable, natural pitch, no added vowel or echo.
- **Short vs long must be obvious.** مَ is short and crisp; مَا is clearly held, roughly twice as long. Record مَ and مَا one after another so the contrast is consistent.
- **Hamza**: أَ إِ أُ start with a clean glottal stop. Emphatic letters (ص ض ط ظ) and ق must be properly emphatic/back; ع and ح must be pharyngeal.
- **Words and sentences**: slow and clear for FS2, with every short vowel audible, including the final one (كَتَبَ ends in /a/).
- **Stories**: slow, warm storytelling voice; a short pause between sentences.
- **Technical**: mono, 44.1 or 48 kHz, quiet room, no music or effects. Leave about 0.2 s of silence before and after. Normalise loudness consistently (about −16 LUFS). Export MP3 at 128 kbps or higher (or AAC/m4a).

## Review (required before release)

Every file needs a second Arabic specialist to listen and confirm:

1. it matches the vowelled text in the checklist exactly (correct vowel, and short vs long);
2. phonemes are the sound only, not the letter name;
3. there are no clicks, cut-offs or background noise.

Record the reviewer's name and date in your copy of the checklist.

## Installing recordings

1. Copy the files into the matching folders in `public/audio/`.
2. Run:
   ```bash
   npm run audio:manifest     # also runs automatically before every build
   npm run audio:checklist    # optional: updates the "recorded" column
   ```
3. Rebuild: `npm run build`. The 📊 screen → *System* shows how many validated recordings are installed.

No code changes are needed: the app finds clips by their path in `src/data/*.json`.

## Adding audio for new content

When you add a word, story or sentence to `src/data/*.json`, give it an `audio` path in the same style, run `npm run audio:checklist`, and record the new lines.
