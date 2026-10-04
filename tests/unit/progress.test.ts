import { describe, expect, it } from 'vitest';
import { LETTERS } from '../../src/curriculum/content';
import { MemoryRepository, LocalStorageRepository } from '../../src/services/progress/repository';
import { ProgressStore } from '../../src/services/progress/store';
import { normaliseProgress } from '../../src/services/progress/model';
import { isLongVowelLevelUnlocked, isSentenceLevelUnlocked, masteredLetters, isLetterMastered } from '../../src/services/progress/selectors';

const meem = LETTERS.find((l) => l.char === 'م')!;

describe('progress store', () => {
  it('a letter is mastered only after all three forms', () => {
    const store = new ProgressStore(new MemoryRepository());
    store.completeForm('meem_a');
    store.completeForm('meem_i');
    expect(isLetterMastered(store.getState(), meem)).toBe(false);
    store.completeForm('meem_u');
    expect(masteredLetters(store.getState())).toEqual(new Set(['م']));
  });
  it('long forms do not count towards short mastery', () => {
    const store = new ProgressStore(new MemoryRepository());
    ['meem_aa', 'meem_ii', 'meem_uu'].forEach((f) => store.completeForm(f));
    expect(masteredLetters(store.getState()).size).toBe(0);
  });
  it('persists through the repository', () => {
    const repo = new MemoryRepository();
    new ProgressStore(repo).completeForm('baa_a');
    expect(new ProgressStore(repo).getState().completedForms.baa_a).toBeTruthy();
  });
  it('service outages are not counted as child attempts', () => {
    const store = new ProgressStore(new MemoryRepository());
    store.recordPronunciation({ targetId: 'x', targetText: 'مَ', at: '', outcome: 'unavailable', engine: 't' });
    store.recordPronunciation({ targetId: 'x', targetText: 'مَ', at: '', outcome: 'incorrect', engine: 't' });
    store.recordPronunciation({ targetId: 'x', targetText: 'مَ', at: '', outcome: 'correct', engine: 't' });
    expect(store.getState().pronunciation).toEqual({ attempts: 2, correct: 1 });
    expect(store.getState().attempts).toHaveLength(3);
  });
  it('unlocks long vowels after 8 letters, sentences after 5 words', () => {
    const store = new ProgressStore(new MemoryRepository());
    const eight = ['ك', 'ت', 'ب', 'ه', 'و', 'أ', 'ل', 'ش'];
    for (const c of eight.slice(0, 7)) LETTERS.find((l) => l.char === c)!.forms.forEach((f) => store.completeForm(f.id));
    expect(isLongVowelLevelUnlocked(store.getState())).toBe(false);
    LETTERS.find((l) => l.char === 'ش')!.forms.forEach((f) => store.completeForm(f.id));
    expect(isLongVowelLevelUnlocked(store.getState())).toBe(true);
    expect(isSentenceLevelUnlocked(store.getState())).toBe(false);
    ['kataba', 'akala', 'shariba', 'huwa', 'laka'].forEach((w) => store.recordWordBuilt(w));
    expect(isSentenceLevelUnlocked(store.getState())).toBe(true);
  });
  it('corrupt storage never crashes', () => {
    expect(normaliseProgress('garbage').completedForms).toEqual({});
    expect(normaliseProgress({ completedForms: [1, 2], pronunciation: 'x' }).pronunciation).toEqual({ attempts: 0, correct: 0 });
    const repo = new LocalStorageRepository();
    expect(repo.load().version).toBe(1); // no localStorage in node → defaults
  });
});
