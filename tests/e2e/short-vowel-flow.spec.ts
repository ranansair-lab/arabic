import { expect, test } from '@playwright/test';
import { completeCurrentForm, holdAndSay, installFakeMic, letterByChar, masterLetterViaUi, playSoundGame, SOUND_WORDS } from './helpers';

test.beforeEach(async ({ page }) => {
  await installFakeMic(page);
});

test('TEST 1 — choose م: مَ appears alone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home-title')).toHaveText('اِخْتَرْ حَرْفًا لِتَتَعَلَّمَهُ');
  await expect(page.getByTestId('letter-grid').locator('.letter-tile')).toHaveCount(28);
  await page.getByTestId('letter-meem').click();
  await expect(page.getByTestId('step-listen')).toBeVisible();
  await expect(page.getByTestId('listen-target')).toHaveText('مَ');
  // Only one vowelled form is on screen while teaching.
  await expect(page.getByText('مِ', { exact: true })).toHaveCount(0);
  await expect(page.getByText('مُ', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('instruction-listen_carefully')).toContainText('اِسْتَمِعْ جَيِّدًا');
});

test('TEST 2 + 3 — next shows discrimination (never blank); choosing مَ opens recording', async ({ page }) => {
  await page.goto('/#/letter/meem');
  await page.getByTestId('next').click();
  const disc = page.getByTestId('step-discriminate');
  await expect(disc).toBeVisible();
  await expect(page.getByTestId('instruction-which_sound')).toContainText('أَيُّ صَوْتٍ سَمِعْتَ؟');
  const values = await disc.getByTestId('choice').evaluateAll((els) => els.map((e) => e.getAttribute('data-value')));
  expect(values.sort()).toEqual(['مَ', 'مِ', 'مُ'].sort());
  // Wrong answer: gentle retry, answer not revealed, still on the same step.
  await disc.locator('[data-testid=choice][data-value="مُ"]').click();
  await expect(page.getByTestId('feedback-try')).toContainText('حَاوِلْ مَرَّةً أُخْرَى');
  await expect(disc.locator('.choice.correct')).toHaveCount(0);
  await disc.locator('[data-testid=choice][data-value="مَ"]').click();
  await expect(page.getByTestId('feedback-ok')).toContainText('أَحْسَنْتَ!');
  await expect(page.getByTestId('step-pronounce')).toBeVisible();
  await expect(page.getByTestId('pronounce-target')).toHaveText('مَ'); // vowelled, never bare م
  await expect(page.getByTestId('instruction-hold_and_say')).toContainText('اِضْغَطْ مُطَوَّلًا وَقُلْ:');
});

test('TEST 4 — hold & release: wrong vowel → retry, right vowel → صحيح → التالي', async ({ page }) => {
  await page.goto('/#/letter/meem');
  await page.getByTestId('next').click();
  await page.locator('[data-testid=choice][data-value="مَ"]').click();
  await expect(page.getByTestId('step-pronounce')).toBeVisible();

  await holdAndSay(page, 'kasra'); // says مِ for target مَ
  await expect(page.getByTestId('result-incorrect')).toContainText('حَاوِلْ مَرَّةً أُخْرَى');
  await expect(page.getByTestId('rerecord-label')).toContainText('إِعَادَةُ التَّسْجِيلِ');
  await expect(page.getByTestId('next')).toHaveCount(0);

  await holdAndSay(page, 'damma'); // says مُ
  await expect(page.getByTestId('result-incorrect')).toBeVisible();

  await holdAndSay(page, null); // silence
  await expect(page.getByTestId('result-no-speech')).toBeVisible();
  await expect(page.getByTestId('next')).toHaveCount(0);

  await holdAndSay(page, 'fatha'); // مَ
  await expect(page.getByTestId('result-correct')).toContainText('صَحِيحٌ!');
  await expect(page.getByTestId('next')).toContainText('التَّالِي');
});

test('a quick tap (not a hold) does not record or score', async ({ page }) => {
  await page.goto('/#/letter/meem');
  await page.getByTestId('next').click();
  await page.locator('[data-testid=choice][data-value="مَ"]').click();
  const mic = page.getByTestId('mic-button');
  await expect(mic).toBeEnabled();
  await mic.click();
  await expect(page.getByTestId('hint-hold-longer')).toBeVisible();
  await expect(page.getByTestId('result-correct')).toHaveCount(0);
});

test('TEST 5 + 6 — مَ then مِ then مُ; م gets ✓ on home', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('letter-meem').click();
  await completeCurrentForm(page, 'fatha');
  await expect(page.getByTestId('listen-target')).toHaveText('مِ');
  await completeCurrentForm(page, 'kasra');
  await expect(page.getByTestId('listen-target')).toHaveText('مُ');
  await completeCurrentForm(page, 'damma');
  await playSoundGame(page);
  await expect(page.getByTestId('letter-complete')).toBeVisible();
  await expect(page.getByTestId('complete-message')).toContainText('أَتْمَمْتَ حَرْفَ م');
  await page.getByTestId('choose-another').click();
  await expect(page.getByTestId('home')).toBeVisible(); // not forced into the next letter
  await expect(page.getByTestId('letter-meem')).toHaveAttribute('data-mastered', 'true');
  await expect(page.getByTestId('letter-meem').getByTestId('mastered-check')).toHaveText('✓');
  // Persists after reload.
  await page.reload();
  await expect(page.getByTestId('letter-meem')).toHaveAttribute('data-mastered', 'true');
});

test('a lesson resumes at the first unfinished form', async ({ page }) => {
  await page.goto('/#/letter/baa');
  await completeCurrentForm(page, 'fatha');
  await page.getByTestId('nav-home').click();
  await expect(page.getByTestId('letter-baa')).toHaveAttribute('data-mastered', 'false');
  await page.getByTestId('letter-baa').click();
  await expect(page.getByTestId('listen-target')).toHaveText('بِ');
});

test('TEST 7 — any letter in any order (ظ then أ)', async ({ page }) => {
  test.setTimeout(120_000); // two full lessons, each followed by the game
  await page.goto('/');
  await masterLetterViaUi(page, 'ظ');
  await page.getByTestId('letter-alif').click();
  await expect(page.getByTestId('listen-target')).toHaveText('أَ');
  await completeCurrentForm(page, 'fatha');
  await expect(page.getByTestId('listen-target')).toHaveText('إِ');
  await completeCurrentForm(page, 'kasra');
  await expect(page.getByTestId('listen-target')).toHaveText('أُ');
  await completeCurrentForm(page, 'damma');
  await playSoundGame(page);
  await page.getByTestId('choose-another').click();
  for (const id of ['zhaa', 'alif']) await expect(page.getByTestId(`letter-${id}`)).toHaveAttribute('data-mastered', 'true');
  await expect(page.getByTestId('letter-baa')).toHaveAttribute('data-mastered', 'false');
  expect(letterByChar('ظ').id).toBe('zhaa');
});

test('microphone denied → simple instructions, retry, never marked correct', async ({ page }) => {
  await page.goto('/#/letter/meem');
  await page.evaluate(() => (window as any).__fakeMic.deny());
  await page.getByTestId('next').click();
  await page.locator('[data-testid=choice][data-value="مَ"]').click();
  await expect(page.getByTestId('mic-help')).toHaveAttribute('data-error', 'denied');
  await expect(page.getByTestId('next')).toHaveCount(0);
  await page.evaluate(() => (window as any).__fakeMic.allow());
  await page.getByTestId('mic-retry').click();
  await holdAndSay(page, 'fatha');
  await expect(page.getByTestId('result-correct')).toBeVisible();
});

test.describe('no recordings installed', () => {
  // Recordings now exist, so simulate a production build with none installed.
  // The service worker is blocked so it cannot fetch the real audio list behind the mock.
  test.use({ serviceWorkers: 'block' });

  test('audio missing in production → visible "audio unavailable" state, flow continues', async ({ page }) => {
    await page.context().route('**/audio/manifest.json', (route) => route.fulfill({ json: { files: {} } }));
    await page.goto('/#/letter/meem');
    await expect(page.getByTestId('target-audio')).toHaveAttribute('data-status', 'unavailable');
    await expect(page.getByTestId('audio-unavailable')).toBeVisible();
    await page.getByTestId('next').click();
    await expect(page.getByTestId('step-discriminate')).toBeVisible();
  });
});

test('back/home navigation from every main screen', async ({ page }) => {
  for (const path of ['/#/letter/meem', '/#/words', '/#/build', '/#/stories', '/#/long', '/#/sentences', '/#/mini-stories', '/#/progress', '/#/nope']) {
    await page.goto(path);
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await page.getByTestId('nav-home').click();
    await expect(page.getByTestId('home')).toBeVisible();
  }
});

test('initial-sound game: after the third sound, wrong → try again (not revealed), right → confetti + praise, one round per word', async ({ page }) => {
  // ض has picture words for ضَ and ضِ only, so its game has two rounds.
  const daad = letterByChar('ض');
  const words = SOUND_WORDS.filter((w) => w.letterId === daad.id);
  expect(words.map((w) => w.sound)).toEqual(['ضَ', 'ضِ']);
  await page.addInitScript((ids) => {
    const done = Object.fromEntries(ids.map((id) => [id, '2026-01-01T00:00:00Z']));
    localStorage.setItem('arabic-reading:progress:v1', JSON.stringify({
      version: 1, profileId: 'default', completedForms: done, discrimination: { attempts: 0, correct: 0 }, pronunciation: { attempts: 0, correct: 0 },
      attempts: [], wordsBuilt: {}, wordsAnalysed: {}, storiesCompleted: {}, sentencesRead: {}, miniStoriesRead: {}, updatedAt: '2026-01-01T00:00:00Z',
    }));
  }, daad.forms.slice(0, 2).map((f) => f.id));
  await page.goto(`/#/letter/${daad.id}`);
  await completeCurrentForm(page, 'damma');

  const step = page.getByTestId('step-sound-game');
  await expect(step).toHaveAttribute('data-target', 'daad_a');
  await expect(page.getByTestId('game-sound')).toHaveText('ضَ');
  const cards = step.getByTestId('word-choice');
  await expect(cards).toHaveCount(3);
  await expect(step.locator('[data-sound-id="daad_a"]')).toContainText('ضَبَاب');

  // Wrong card: gentle retry, no confetti, the answer is not marked.
  await step.locator('[data-testid=word-choice]:not([data-sound-id="daad_a"])').first().click();
  await expect(page.getByTestId('feedback-try')).toBeVisible();
  await expect(page.getByTestId('confetti')).toHaveCount(0);
  await expect(step.locator('.choice.correct')).toHaveCount(0);

  // Right card: confetti + praise, then the next round by itself.
  await step.locator('[data-sound-id="daad_a"]').click();
  await expect(page.getByTestId('confetti')).toBeVisible();
  await expect(page.getByTestId('game-correct')).toBeVisible();
  await expect(step).toHaveAttribute('data-target', 'daad_i', { timeout: 6000 });
  await step.locator('[data-sound-id="daad_i"]').click();
  await expect(page.getByTestId('letter-complete')).toBeVisible({ timeout: 6000 });

  // The game can be replayed from the completion screen.
  await page.getByTestId('play-again').click();
  await expect(page.getByTestId('step-sound-game')).toHaveAttribute('data-target', 'daad_a');
});
