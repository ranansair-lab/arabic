import { expect, test } from '@playwright/test';
import { installFakeMic, seed } from './helpers';

const ROUTES = ['/', '#/letter/meem', '#/letter/alif', '#/words', '#/build', '#/stories', '#/stories/meem', '#/long', '#/long/meem',
  '#/long/build', '#/sentences', '#/mini-stories', '#/mini-stories/ms01', '#/progress', '#/calibrate', '#/letter/unknown', '#/zzz'];

for (const seeded of [false, true]) {
  test(`no runtime errors on any screen (${seeded ? 'with progress' : 'new child'})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      // Missing recordings are an expected, handled state in this build.
      if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
    });
    await installFakeMic(page);
    if (seeded) await seed(page, { letters: ['ه', 'و', 'ك', 'ت', 'ب', 'م', 'ل', 'أ', 'ش', 'ر', 'ج', 'س', 'غ', 'ف', 'ط', 'خ', 'ع', 'ض', 'ح', 'د', 'ق'], longLetters: ['م', 'ب'], wordsBuilt: ['kataba', 'huwa', 'akala', 'shariba', 'laka'], sentences: ['s01', 's02', 's03'] });
    for (const r of ROUTES) {
      await page.goto('/' + r.replace(/^\//, ''));
      await page.waitForTimeout(400);
      await expect(page.locator('main')).toBeVisible(); // never blank
      await expect(page.getByTestId('error-state')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}
