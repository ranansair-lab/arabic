import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

// Uses Chromium's own fake capture device fed by a WAV of a child saying /ma/
// (generated in global-setup) — exercises the genuine getUserMedia path.
test.use({
  launchOptions: {
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${resolve('test-results/fake-fatha.wav')}`,
    ],
  },
});

async function holdFor(page: import('@playwright/test').Page, ms: number) {
  const box = (await page.getByTestId('mic-button').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

test('real capture device: /ma/ is accepted for مَ and rejected for مِ', async ({ page }) => {
  await page.goto('/#/letter/meem');
  await page.getByTestId('next').click();
  await page.locator('[data-testid=choice][data-value="مَ"]').click();
  await expect(page.getByTestId('mic-button')).toBeEnabled();
  await holdFor(page, 1400);
  await expect(page.getByTestId('result-correct')).toBeVisible();
  await page.getByTestId('next').click();

  await page.getByTestId('next').click(); // listen مِ
  await page.locator('[data-testid=choice][data-value="مِ"]').click();
  await expect(page.getByTestId('pronounce-target')).toHaveText('مِ');
  await holdFor(page, 1400);
  await expect(page.getByTestId('result-incorrect')).toBeVisible();
});
