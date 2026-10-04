import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

const load = (f: string) => JSON.parse(readFileSync(new URL(`../../src/data/${f}`, import.meta.url), 'utf8'));
export const LETTERS: { id: string; char: string; forms: { id: string; text: string; vowel: string }[]; longForms: { id: string; text: string; vowel: string }[] }[] = load('letters.json');
export const WORDS: { id: string; word: string; segments: string[]; requiredLetters: string[]; level: number }[] = load('words.json');
export const SOUND_WORDS: { soundId: string; letterId: string; sound: string; word: string }[] = load('sound-words.json');
export const STORIES: { letter: string; letterId: string }[] = load('stories.json');

export type Vowel = 'fatha' | 'kasra' | 'damma';
export const letterByChar = (c: string) => LETTERS.find((l) => l.char === c)!;

interface Seed { letters?: string[]; longLetters?: string[]; wordsBuilt?: string[]; sentences?: string[] }

/** Seeds saved progress before the app loads. */
export async function seed(page: Page, s: Seed) {
  const completedForms: Record<string, string> = {};
  for (const c of s.letters ?? []) for (const f of letterByChar(c).forms) completedForms[f.id] = '2026-01-01T00:00:00Z';
  for (const c of s.longLetters ?? []) for (const f of letterByChar(c).longForms) completedForms[f.id] = '2026-01-01T00:00:00Z';
  const state = {
    version: 1, profileId: 'default', completedForms,
    discrimination: { attempts: 0, correct: 0 }, pronunciation: { attempts: 0, correct: 0 }, attempts: [],
    wordsBuilt: Object.fromEntries((s.wordsBuilt ?? []).map((w) => [w, 1])), wordsAnalysed: {},
    storiesCompleted: {}, sentencesRead: Object.fromEntries((s.sentences ?? []).map((id) => [id, '2026-01-01'])), miniStoriesRead: {},
    updatedAt: '2026-01-01T00:00:00Z',
  };
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('arabic-reading:progress:v1', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(state));
}

export async function installFakeMic(page: Page) {
  await page.addInitScript({ path: new URL('./fake-mic.js', import.meta.url).pathname });
}

/** Press and HOLD the mic, "speak" a vowel, release. */
export async function holdAndSay(page: Page, vowel: Vowel | null, opts: { vowelMs?: number; holdMs?: number } = {}) {
  const mic = page.getByTestId('mic-button');
  await expect(mic).toBeEnabled();
  const box = (await mic.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(mic).toHaveAttribute('data-phase', 'recording');
  await page.waitForTimeout(150);
  if (vowel) await page.evaluate(([v, ms]) => (window as any).__fakeMic.say(v, ms), [vowel, opts.vowelMs ?? 260] as const);
  await page.waitForTimeout(opts.holdMs ?? Math.max(700, (opts.vowelMs ?? 260) + 450));
  await page.mouse.up();
}

/** Completes listen → discriminate → pronounce for the currently shown form. */
export async function completeCurrentForm(page: Page, vowel: Vowel) {
  const listen = page.getByTestId('step-listen');
  await expect(listen).toBeVisible();
  const target = await listen.getAttribute('data-target');
  await page.getByTestId('next').click();
  const disc = page.getByTestId('step-discriminate');
  await expect(disc).toBeVisible();
  await disc.locator(`[data-testid=choice][data-value="${target}"]`).click();
  await expect(page.getByTestId('step-pronounce')).toBeVisible();
  await expect(page.getByTestId('pronounce-target')).toHaveText(target!);
  await holdAndSay(page, vowel);
  await expect(page.getByTestId('result-correct')).toBeVisible();
  await page.getByTestId('next').click();
}

/** Plays every round of the initial-sound game correctly (it follows the third sound of a letter). */
export async function playSoundGame(page: Page) {
  await expect(page.getByTestId('sound-game').or(page.getByTestId('letter-complete'))).toBeVisible();
  for (let round = 0; round < 3 && (await page.getByTestId('sound-game').isVisible()); round++) {
    const step = page.getByTestId('step-sound-game');
    const target = await step.getAttribute('data-target');
    await step.locator(`[data-testid=word-choice][data-sound-id="${target}"]`).click();
    await expect(page.getByTestId('game-correct')).toBeVisible();
    await expect(page.locator(`[data-testid=step-sound-game][data-target="${target}"]`)).toHaveCount(0);
  }
}

export async function masterLetterViaUi(page: Page, char: string) {
  const l = letterByChar(char);
  await page.getByTestId(`letter-${l.id}`).click();
  for (const v of ['fatha', 'kasra', 'damma'] as const) await completeCurrentForm(page, v);
  await playSoundGame(page);
  await expect(page.getByTestId('letter-complete')).toBeVisible();
  await page.getByTestId('choose-another').click();
  await expect(page.getByTestId('home')).toBeVisible();
}
