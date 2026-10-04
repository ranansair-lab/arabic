# Editing the curriculum

All content lives in `src/data/*.json`. After any edit, run `npm test`. The tests reject content that would break the teaching rules.

## Words — `words.json`

```json
{
  "id": "kataba",
  "word": "كَتَبَ",
  "segments": ["كَ", "تَ", "بَ"],
  "requiredLetters": ["ك", "ت", "ب"],
  "level": 1,
  "translit": "kataba",
  "gloss": "wrote",
  "emoji": "✍️",
  "audio": "words/kataba.mp3"
}
```

The tests check that:

- every letter carries exactly one short vowel (no sukun, shadda or tanween at Levels 1–2);
- `segments` joined together equal `word`, and each segment is a taught sound;
- `requiredLetters` matches the letters actually in the word;
- Level 1 words contain **no** حروف المد; Level 2 words contain at least one;
- ids and audio paths are unique.

Level 1 currently has 66 words (mostly فَعَلَ past-tense verbs, plus هُوَ هِيَ مَعَ لَكَ), which are fully decodable with short vowels only. Level 2 has 22 words such as مَامَا، بَابَا، نَامَ، طَارَ، يَطِيرُ، يَقُولُ.

## Stories — `stories.json`

Exactly three short sentences per letter. The tests check that the target letter is the most frequent letter heard (madd alif and pausal ة are not counted), with at least 8 occurrences and a clear lead over the next letter. That makes **مَا أَكْثَرُ حَرْفٍ سَمِعْتَ؟** a fair question. The two wrong choices are picked automatically: mastered letters are preferred, and only letters that appear at most half as often as the target are used.

Stories are listening texts, so they use natural, fully vowelled MSA with tanween and ال. They are shown only for mastered letters, but they are not decoding targets.

## Sentences — `sentences.json`

Every word must be decodable with short vowels (the tests segment each word). Each sentence has one correct picture and two distractors.

## Instructions — `instructions.json`

Every instruction is fully vowelled and has an audio path.

## Thresholds

`src/curriculum/levels.ts` → `CURRICULUM_RULES` (letters needed for long vowels, words needed for sentences, and so on).

## Arabic review

The content was written with care for correct MSA and full tashkeel, but a qualified Arabic specialist should still review every story, word and instruction before release, just like the audio.
