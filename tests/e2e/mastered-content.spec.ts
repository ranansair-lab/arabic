import { expect, test, type Page } from '@playwright/test';
import { holdAndSay, installFakeMic, letterByChar, seed, STORIES, WORDS } from './helpers';

const SET = ['ك', 'ت', 'ب', 'ه', 'و', 'ل', 'أ', 'ش', 'ر'];
const LEARN_MORE = 'تَعَلَّمْ حُرُوفًا أَكْثَرَ أَوَّلًا';

test.beforeEach(async ({ page }) => installFakeMic(page));

test('TEST 8 — قصة حرف shows only mastered letters', async ({ page }) => {
  await seed(page, { letters: ['م', 'ب'] });
  await page.goto('/');
  await page.getByTestId('menu-stories').click();
  const ids = await page.locator('[data-testid^=story-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')).filter((x) => x !== 'story-list'));
  expect(ids.sort()).toEqual(['story-baa', 'story-meem']);
  // Deep link to an unlearned letter's story is refused.
  await page.goto('/#/stories/kaaf');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('story: listen, question, wrong → listen again, right → ⭐', async ({ page }) => {
  await seed(page, { letters: ['م', 'ب'] });
  await page.goto('/#/stories/meem');
  await expect(page.getByTestId('story-text').locator('.story-line')).toHaveCount(3);
  await page.getByTestId('listen-story').click();
  await expect(page.getByTestId('story-question')).toBeVisible();
  await expect(page.getByTestId('instruction-most_letter')).toContainText('مَا أَكْثَرُ حَرْفٍ سَمِعْتَ؟');
  const choices = await page.getByTestId('choice').evaluateAll((els) => els.map((e) => e.getAttribute('data-value')));
  expect(choices).toHaveLength(3);
  expect(choices).toContain('م');
  const wrong = choices.find((c) => c !== 'م')!;
  await page.locator(`[data-testid=choice][data-value="${wrong}"]`).click();
  await expect(page.getByTestId('story-wrong')).toContainText('اِسْتَمِعْ إِلَى الْقِصَّةِ مَرَّةً أُخْرَى');
  await page.locator('[data-testid=choice][data-value="م"]').click();
  await expect(page.getByTestId('story-correct')).toBeVisible();
  await page.getByTestId('next').click();
  await expect(page.getByTestId('story-meem')).toContainText('⭐');
  expect(STORIES).toHaveLength(28);
});

test('TEST 9 — كلماتي: only fully-mastered words, analysis + segmentation', async ({ page }) => {
  await seed(page, { letters: SET });
  await page.goto('/');
  await page.getByTestId('menu-words').click();
  for (let i = 0; i < 6; i++) {
    const panel = page.getByTestId('word-analysis');
    await expect(panel).toBeVisible();
    const id = await panel.getAttribute('data-word-id');
    const kind = await panel.getAttribute('data-kind');
    const w = WORDS.find((x) => x.id === id)!;
    expect(w.requiredLetters.every((l) => SET.includes(l)), `${w.word} uses only mastered letters`).toBe(true);
    await expect(page.getByTestId('analysis-word')).toHaveText(w.word);
    const answer = kind === 'first' ? w.segments[0] : kind === 'last' ? w.segments.at(-1)! : w.segments[Math.floor(w.segments.length / 2)];
    const choices = await panel.getByTestId('choice').evaluateAll((els) => els.map((e) => e.getAttribute('data-value')!));
    for (const c of choices) {
      const base = Array.from(c)[0].replace(/[إآ]/, 'أ');
      expect(SET.includes(base), `choice ${c} from a mastered letter`).toBe(true);
    }
    await panel.locator(`[data-testid=choice][data-value="${answer}"]`).click();
    await expect(page.getByTestId('segmentation')).toHaveText(w.segments.join(' + '));
    await page.getByTestId('next').click();
  }
});

async function buildCurrentWord(page: Page) {
  const builder = page.getByTestId('word-builder');
  await expect(builder).toBeVisible();
  // 'wrong' persists (with its gentle message) until the child taps a sound again.
  await expect(builder).toHaveAttribute('data-phase', /building|wrong/);
  const id = (await builder.getAttribute('data-word-id'))!;
  const w = WORDS.find((x) => x.id === id)!;
  // Audio-first: the written word is NOT on screen before success.
  await expect(page.getByTestId('joined-word')).toHaveCount(0);
  for (const seg of w.segments) await page.locator(`[data-testid=bank-tile][data-value="${seg}"]:not([disabled])`).first().click();
  await page.getByTestId('check').click();
  return w;
}

test('TEST 10 + 11 — تركيب كلمة: eligible words, success animation, auto-advance', async ({ page }) => {
  await seed(page, { letters: SET });
  await page.goto('/');
  await page.getByTestId('menu-build').click();
  const builder = page.getByTestId('word-builder');
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    const tiles = await page.getByTestId('bank-tile').evaluateAll((els) => els.map((e) => e.getAttribute('data-value')!));
    for (const t of tiles) expect(SET.includes(Array.from(t)[0].replace(/[إآ]/, 'أ')), `bank sound ${t}`).toBe(true);
    const w = await buildCurrentWord(page);
    expect(w.requiredLetters.every((l) => SET.includes(l))).toBe(true);
    seen.push(w.id);
    await expect(page.getByTestId('build-success')).toBeVisible();
    await expect(page.getByTestId('assembled')).toHaveAttribute('data-phase', /separate|close|joined/);
    await expect(page.getByTestId('joined-word')).toHaveText(w.word, { timeout: 4000 });
    // Automatically moves to the NEXT eligible word — no menu trip.
    await expect(builder).not.toHaveAttribute('data-word-id', w.id, { timeout: 9000 });
    await expect(builder).toHaveAttribute('data-phase', 'building');
  }
  expect(new Set(seen).size).toBe(3);
});

test('word building: wrong order → listen again, not revealed', async ({ page }) => {
  await seed(page, { letters: ['ك', 'ت', 'ب'] });
  await page.goto('/#/build');
  const builder = page.getByTestId('word-builder');
  await expect(builder).toHaveAttribute('data-word-id', 'kataba');
  for (const seg of ['بَ', 'تَ', 'كَ']) await page.locator(`[data-testid=bank-tile][data-value="${seg}"]:not([disabled])`).first().click();
  await page.getByTestId('check').click();
  await expect(page.getByTestId('build-wrong')).toContainText('اِسْتَمِعْ مَرَّةً أُخْرَى وَحَاوِلْ');
  await expect(page.getByTestId('joined-word')).toHaveCount(0);
  // Slots are cleared for another try.
  await expect(page.locator('[data-testid=slot][data-value=""]')).toHaveCount(3);
  await buildCurrentWord(page);
  await expect(page.getByTestId('joined-word')).toHaveText('كَتَبَ', { timeout: 4000 });
});

test('TEST 12 — no eligible content → friendly message everywhere', async ({ page }) => {
  await seed(page, { letters: ['م'] });
  for (const btn of ['menu-words', 'menu-build']) {
    await page.goto('/');
    await page.getByTestId(btn).click();
    await expect(page.getByTestId('empty-state')).toContainText(LEARN_MORE);
    await expect(page.getByTestId('word-builder')).toHaveCount(0);
    await expect(page.getByTestId('word-analysis')).toHaveCount(0);
  }
  await page.goto('/#/sentences');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('TEST 12b — nothing mastered: stories empty too', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('menu-stories').click();
  await expect(page.getByTestId('empty-state')).toContainText(LEARN_MORE);
  await page.getByTestId('empty-go-home').click();
  await expect(page.getByTestId('home')).toBeVisible();
});

test('Level 2 stays locked until 8 letters are mastered', async ({ page }) => {
  await seed(page, { letters: ['م', 'ب', 'ت'] });
  await page.goto('/');
  await expect(page.getByTestId('level-long')).toHaveAttribute('data-unlocked', 'false');
  await page.getByTestId('level-long').click();
  await expect(page.getByTestId('long-locked')).toBeVisible();
  await page.goto('/#/long/meem');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('Level 2 — مَ → مَا: contrast, blend, short/long discrimination, long pronunciation', async ({ page }) => {
  await seed(page, { letters: [...SET.slice(0, 7), 'م'] });
  await page.goto('/');
  await expect(page.getByTestId('level-long')).toHaveAttribute('data-unlocked', 'true');
  await page.getByTestId('level-long').click();
  await page.getByTestId(`long-letter-${letterByChar('م').id}`).click();
  await expect(page.getByTestId('contrast-short')).toHaveText('مَ');
  await expect(page.getByTestId('contrast-long')).toHaveText('مَا');
  await page.getByTestId('next').click();
  await page.getByTestId('blend').click();
  await expect(page.getByTestId('blend-result')).toHaveText('مَا');
  await page.getByTestId('next').click();
  for (let round = 0; round < 2; round++) {
    const disc = page.getByTestId('step-discriminate');
    await expect(disc).toBeVisible();
    const target = (await disc.getAttribute('data-target'))!;
    const values = await disc.getByTestId('choice').evaluateAll((els) => els.map((e) => e.getAttribute('data-value')));
    expect(values).toContain('مَ');
    expect(values).toContain('مَا');
    await disc.locator(`[data-testid=choice][data-value="${target}"]`).click();
    await expect(page.getByTestId('feedback-ok')).toBeVisible();
    await expect(disc).not.toHaveAttribute('data-target', target, { timeout: 4000 }).catch(() => undefined);
  }
  await expect(page.getByTestId('pronounce-target')).toHaveText('مَا');
  await holdAndSay(page, 'fatha', { vowelMs: 220 }); // too short for مَا
  await expect(page.getByTestId('result-incorrect')).toContainText('مُدَّ الصَّوْتَ');
  await holdAndSay(page, 'fatha', { vowelMs: 700, holdMs: 1300 });
  await expect(page.getByTestId('result-correct')).toBeVisible();
  await page.getByTestId('next').click();
  await expect(page.getByTestId('contrast-long')).toHaveText('مِي');
});

test('Sentences: locked until words practised; then read, record, picture choice', async ({ page }) => {
  await seed(page, { letters: ['ه', 'و', 'ك', 'ت', 'ب'], wordsBuilt: ['kataba', 'huwa', 'a', 'b', 'c'] });
  await page.goto('/');
  await expect(page.getByTestId('level-sentences')).toHaveAttribute('data-unlocked', 'true');
  await page.getByTestId('level-sentences').click();
  await expect(page.getByTestId('sentence-read')).toHaveAttribute('data-sentence-id', 's01');
  await expect(page.getByTestId('pronounce-target')).toHaveText('هُوَ كَتَبَ.');
  await expect(page.getByTestId('to-picture')).toBeDisabled();
  await holdAndSay(page, 'fatha', { vowelMs: 500, holdMs: 1000 });
  await expect(page.getByTestId('result-practice')).toBeVisible();
  await expect(page.getByTestId('result-correct')).toHaveCount(0); // practice is never "scored correct" locally
  await page.getByTestId('to-picture').click();
  await page.locator('[data-testid=picture-choice][data-value="🍽️"]').click();
  await expect(page.getByTestId('feedback-try')).toBeVisible();
  await page.locator('[data-testid=picture-choice][data-value="✍️"]').click();
  await expect(page.getByTestId('sentence-correct')).toBeVisible();
});

test('progress screen shows tracked metrics and no leaderboard', async ({ page }) => {
  await seed(page, { letters: ['م', 'ب'], wordsBuilt: ['x'] });
  await page.goto('/#/progress');
  await expect(page.getByTestId('stats')).toContainText('Letters mastered');
  await expect(page.getByTestId('stats')).toContainText('2 / 28');
  await expect(page.locator('[data-testid=badges] [data-earned=true]')).toHaveCount(2);
  await expect(page.getByTestId('system-info')).toContainText('on-device-vowel-v1');
});
