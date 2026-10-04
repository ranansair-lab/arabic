import { describe, expect, it } from 'vitest';
import { countLetters, DAMMA, FATHA, KASRA, SHADDA, SUKUN, FATHATAN, DAMMATAN, KASRATAN, segmentWord, sentenceWords } from '../../src/curriculum/arabic';
import { INSTRUCTIONS, LETTERS, MINI_STORIES, SENTENCES, SOUND_WORDS, STORIES, WORDS, getSoundByText } from '../../src/curriculum/content';
import {
  eligibleLongWords, eligibleShortWords, eligibleSentences, eligibleStories, isWordEligible, masteredShortSounds, eligibleMiniStories,
} from '../../src/curriculum/eligibility';
import { analysisQuestion, buildSoundBank, initialSoundRounds, isBuildCorrect, longDiscriminationChoices, shortDiscriminationChoices, storyLetterChoices } from '../../src/curriculum/activities';
import { seededRng } from '../../src/curriculum/random';

const ALPHABET = 'أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' ');
const set = (s: string) => new Set(s.split(''));

describe('letters', () => {
  it('has all 28 letters in order', () => {
    expect(LETTERS.map((l) => l.char)).toEqual(ALPHABET);
  });
  it('every letter has fatha, kasra, damma forms in that order with the correct mark', () => {
    for (const l of LETTERS) {
      expect(l.forms.map((f) => f.vowel)).toEqual(['fatha', 'kasra', 'damma']);
      const marks = l.forms.map((f) => Array.from(f.text).at(-1));
      expect(marks).toEqual([FATHA, KASRA, DAMMA]);
      for (const f of l.forms) {
        expect(f.length).toBe('short');
        expect(Array.from(f.text), 'letter + one short vowel, no madd letter').toHaveLength(2);
      }
    }
  });
  it('alif forms are exactly أَ إِ أُ', () => {
    const alif = LETTERS.find((l) => l.id === 'alif')!;
    expect(alif.forms.map((f) => f.text)).toEqual(['أَ', 'إِ', 'أُ']);
  });
  it('short and long forms are never equivalent (مَ ≠ مَا)', () => {
    for (const l of LETTERS) {
      for (let k = 0; k < 3; k++) {
        expect(l.longForms[k].text).not.toBe(l.forms[k].text);
        expect(l.longForms[k].phonemes).not.toBe(l.forms[k].phonemes);
        expect(l.longForms[k].audio).not.toBe(l.forms[k].audio);
        expect(l.longForms[k].length).toBe('long');
      }
    }
    const meem = LETTERS.find((l) => l.char === 'م')!;
    expect(meem.longForms.map((f) => f.text)).toEqual(['مَا', 'مِي', 'مُو']);
  });
  it('every form has a unique id and audio path', () => {
    const all = LETTERS.flatMap((l) => [...l.forms, ...l.longForms]);
    expect(new Set(all.map((f) => f.id)).size).toBe(all.length);
    expect(new Set(all.map((f) => f.audio)).size).toBe(all.length);
  });
});

describe('segmenter', () => {
  it('segments short-vowel words', () => {
    expect(segmentWord('كَتَبَ').map((s) => s.text)).toEqual(['كَ', 'تَ', 'بَ']);
    expect(segmentWord('هُوَ').map((s) => s.text)).toEqual(['هُ', 'وَ']);
  });
  it('treats madd letters as part of a LONG segment', () => {
    expect(segmentWord('مَامَا').map((s) => [s.text, s.length])).toEqual([['مَا', 'long'], ['مَا', 'long']]);
    expect(segmentWord('يَقُولُ').map((s) => s.text)).toEqual(['يَ', 'قُو', 'لُ']);
  });
  it('rejects skills not yet taught', () => {
    expect(() => segmentWord('مِنْ')).toThrow();
    expect(() => segmentWord('أُمٌّ')).toThrow();
    expect(() => segmentWord('بَيْتٌ')).toThrow();
    expect(() => segmentWord('مم')).toThrow();
  });
});

describe('word database', () => {
  it('ids and audio are unique', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    expect(new Set(WORDS.map((w) => w.audio)).size).toBe(WORDS.length);
  });
  for (const w of WORDS) {
    it(`${w.word} is consistent`, () => {
      const seg = segmentWord(w.word);
      expect(w.segments).toEqual(seg.map((s) => s.text));
      expect(w.segments.join('')).toBe(w.word);
      expect(new Set(w.requiredLetters)).toEqual(new Set(seg.map((s) => s.letter)));
      for (const s of w.segments) expect(getSoundByText(s), `segment ${s} must be a taught sound`).toBeDefined();
      for (const mark of [SUKUN, SHADDA, FATHATAN, DAMMATAN, KASRATAN]) expect(w.word.includes(mark)).toBe(false);
      if (w.level === 1) expect(seg.every((s) => s.length === 'short'), 'Level 1 words must not contain حروف المد').toBe(true);
      else expect(seg.some((s) => s.length === 'long')).toBe(true);
    });
  }
});

describe('stories', () => {
  it('one story per letter', () => {
    expect(STORIES.map((s) => s.letter)).toEqual(ALPHABET);
  });
  for (const s of STORIES) {
    it(`story ${s.letter}: three sentences, target letter clearly most frequent`, () => {
      expect(s.sentences).toHaveLength(3);
      for (const line of s.sentences) {
        expect(line.trim().endsWith('.')).toBe(true);
        expect(sentenceWords(line).length).toBeLessThanOrEqual(6);
      }
      const counts = [...countLetters(s.sentences.join(' ')).entries()].sort((a, b) => b[1] - a[1]);
      expect(counts[0][0]).toBe(s.letter);
      expect(counts[0][1]).toBeGreaterThanOrEqual(8);
      expect(counts[0][1] - counts[1][1]).toBeGreaterThanOrEqual(2);
    });
  }
});

describe('sentences and mini stories', () => {
  for (const s of SENTENCES) {
    it(`${s.text} is decodable with short vowels`, () => {
      const segs = s.words.flatMap((w) => segmentWord(w));
      expect(segs.every((x) => x.length === 'short')).toBe(true);
      expect(new Set(s.requiredLetters)).toEqual(new Set(segs.map((x) => x.letter)));
      expect(s.distractors).toHaveLength(2);
      expect(s.distractors.map((d) => d.emoji)).not.toContain(s.picture.emoji);
    });
  }
  it('mini stories reference existing sentences and have exactly three', () => {
    for (const m of MINI_STORIES) {
      expect(m.sentenceIds).toHaveLength(3);
      for (const id of m.sentenceIds) expect(SENTENCES.find((s) => s.id === id)).toBeDefined();
    }
  });
});

describe('THE mastered-letter rule', () => {
  it('isWordEligible is true only when every letter is mastered', () => {
    const w = WORDS.find((x) => x.word === 'كَتَبَ')!;
    expect(isWordEligible(w, set('كتب'))).toBe(true);
    expect(isWordEligible(w, set('كت'))).toBe(false);
    expect(isWordEligible(w, new Set())).toBe(false);
  });
  it('no eligible content ever contains an unmastered letter (random sets)', () => {
    const rng = seededRng(42);
    for (let trial = 0; trial < 300; trial++) {
      const m = new Set(ALPHABET.filter(() => rng() < 0.35));
      for (const w of eligibleShortWords(m)) expect(w.requiredLetters.every((l) => m.has(l))).toBe(true);
      for (const s of eligibleSentences(m)) expect(s.requiredLetters.every((l) => m.has(l))).toBe(true);
      for (const st of eligibleStories(m)) expect(m.has(st.letter)).toBe(true);
      for (const ms of eligibleMiniStories(m)) expect(ms.requiredLetters.every((l) => m.has(l))).toBe(true);
      for (const w of eligibleLongWords(m, m)) expect(w.requiredLetters.every((l) => m.has(l))).toBe(true);
    }
  });
  it('nothing is eligible with zero or one letter', () => {
    expect(eligibleShortWords(new Set())).toHaveLength(0);
    expect(eligibleShortWords(set('م'))).toHaveLength(0);
    expect(eligibleStories(new Set())).toHaveLength(0);
  });
  it('كتب unlocks كَتَبَ', () => {
    expect(eligibleShortWords(set('كتب')).map((w) => w.word)).toEqual(['كَتَبَ']);
  });
  it('long words need the long-vowel lesson for their long letters', () => {
    const m = set('مب');
    expect(eligibleLongWords(m, new Set())).toHaveLength(0);
    expect(eligibleLongWords(m, set('م')).map((w) => w.word)).toEqual(['مَامَا']);
  });
});

describe('activity generators use only mastered sounds', () => {
  it('word-building bank: targets + distractors from mastered letters only', () => {
    const m = set('كتبمس');
    const w = WORDS.find((x) => x.word === 'كَتَبَ')!;
    for (let seed = 1; seed < 50; seed++) {
      const bank = buildSoundBank(w, masteredShortSounds(m), seededRng(seed));
      for (const t of bank) expect(m.has(LETTERS.find((l) => l.id === getSoundByText(t.text)!.letterId)!.char)).toBe(true);
      for (const seg of w.segments) expect(bank.some((t) => t.text === seg)).toBe(true);
      expect(bank.length).toBeGreaterThanOrEqual(5);
    }
  });
  it('bank keeps duplicates for repeated segments (مَامَا)', () => {
    const w = WORDS.find((x) => x.word === 'مَامَا')!;
    const bank = buildSoundBank(w, masteredShortSounds(set('م')), seededRng(3));
    expect(bank.filter((t) => t.text === 'مَا')).toHaveLength(2);
  });
  it('build check is order-sensitive', () => {
    const w = WORDS.find((x) => x.word === 'كَتَبَ')!;
    expect(isBuildCorrect(w, ['كَ', 'تَ', 'بَ'])).toBe(true);
    expect(isBuildCorrect(w, ['بَ', 'تَ', 'كَ'])).toBe(false);
    expect(isBuildCorrect(w, ['كُ', 'تَ', 'بَ'])).toBe(false);
  });
  it('analysis question has the answer and three distinct choices', () => {
    const m = set('كتبهو');
    for (const word of eligibleShortWords(m)) {
      for (const kind of ['first', 'last'] as const) {
        const q = analysisQuestion(word, kind, masteredShortSounds(m), seededRng(5));
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(3);
      }
    }
    const kataba = WORDS.find((x) => x.word === 'كَتَبَ')!;
    expect(analysisQuestion(kataba, 'first', [], seededRng(1)).answer).toBe('كَ');
    expect(analysisQuestion(kataba, 'middle', [], seededRng(1)).answer).toBe('تَ');
    expect(analysisQuestion(kataba, 'last', [], seededRng(1)).answer).toBe('بَ');
  });
  it('short discrimination offers exactly مَ مِ مُ', () => {
    const meem = LETTERS.find((l) => l.char === 'م')!;
    const c = shortDiscriminationChoices(meem, seededRng(9)).map((s) => s.text).sort();
    expect(c).toEqual(['مَ', 'مِ', 'مُ'].sort());
  });
  it('long discrimination always contains the short counterpart', () => {
    const meem = LETTERS.find((l) => l.char === 'م')!;
    const c = longDiscriminationChoices(meem, meem.longForms[0], seededRng(9)).map((s) => s.text);
    expect(c).toContain('مَا');
    expect(c).toContain('مَ');
  });
  it('story choices: target + two clearly rarer letters, mastered first', () => {
    for (const s of STORIES) {
      const c = storyLetterChoices(s, set('مبكتس'), seededRng(2));
      expect(c).toHaveLength(3);
      expect(c).toContain(s.letter);
      const counts = countLetters(s.sentences.join(' '));
      for (const x of c.filter((x) => x !== s.letter)) expect((counts.get(x) ?? 0) * 2).toBeLessThanOrEqual(counts.get(s.letter)!);
    }
  });
});

describe('instructions', () => {
  it('all instruction texts are vowelled and have audio paths', () => {
    for (const i of INSTRUCTIONS) {
      expect(i.audio).toMatch(/^instructions\/.+\.mp3$/);
      expect(i.text).toMatch(/[َ-ِ]/);
    }
  });
});

describe('initial-sound game', () => {
  const shortSounds = new Map(LETTERS.flatMap((l) => l.forms).map((f) => [f.id, f]));

  it('every picture word starts with exactly its sound, fully vowelled, with a picture and audio path', () => {
    expect(new Set(SOUND_WORDS.map((w) => w.soundId)).size).toBe(SOUND_WORDS.length);
    for (const w of SOUND_WORDS) {
      const sound = shortSounds.get(w.soundId)!;
      expect(sound, w.soundId).toBeDefined();
      expect(w.sound).toBe(sound.text);
      expect(w.letterId).toBe(sound.letterId);
      expect(w.word.startsWith(sound.text), `${w.word} starts with ${sound.text}`).toBe(true);
      expect(w.word.length).toBeGreaterThan(sound.text.length);
      expect(w.emoji.length).toBeGreaterThan(0);
      expect(w.audio).toBe(`sound-words/${w.soundId}.mp3`);
    }
  });

  it('every letter has one to three rounds, one per sound that has a word', () => {
    for (const l of LETTERS) {
      const rounds = initialSoundRounds(l, seededRng(7));
      const expected = l.forms.filter((f) => SOUND_WORDS.some((w) => w.soundId === f.id));
      expect(rounds.map((r) => r.sound.id)).toEqual(expected.map((f) => f.id));
      expect(rounds.length).toBeGreaterThanOrEqual(1);
    }
    expect(initialSoundRounds(LETTERS.find((l) => l.char === 'ض')!).length).toBe(2);
    expect(initialSoundRounds(LETTERS.find((l) => l.char === 'ي')!).length).toBe(1);
  });

  it('each round has three different pictures and exactly one word that starts with the letter', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const l of LETTERS) {
        for (const r of initialSoundRounds(l, seededRng(seed))) {
          expect(r.choices).toHaveLength(3);
          expect(r.choices).toContain(r.answer);
          expect(r.answer.soundId).toBe(r.sound.id);
          expect(r.choices.filter((c) => c.letterId === l.id)).toEqual([r.answer]);
          expect(new Set(r.choices.map((c) => c.letterId)).size).toBe(3);
          expect(new Set(r.choices.map((c) => c.emoji)).size).toBe(3);
        }
      }
    }
  });

  it('no letter has a round when there are no words', () => {
    expect(initialSoundRounds(LETTERS[0], seededRng(1), [])).toEqual([]);
  });
});
