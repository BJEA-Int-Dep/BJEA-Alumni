// Explicit opt-in integration check: sends fictional answers to the configured paid model.
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const external = [];
  page.on('request', (request) => {
    if (/gstatic|openrouter/.test(request.url())) external.push(request.url());
  });
  await page.goto(process.env.SMOKE_URL || 'http://127.0.0.1:5173/create');
  await page.getByRole('button', { name: /安静观察员/ }).click();
  await page.getByPlaceholder('例如：Matcha、小岛、北纬 39°').fill('小行星');
  await page.getByRole('button', { name: '就叫这个' }).click();
  await page.getByLabel('你的形象描述').fill('一只喜欢宇宙、有点反差的猫');
  const pending = page.waitForResponse(
    (result) => result.url().endsWith('/api/avatar/suggestions'),
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: '完成第一阶段' }).click();
  const response = await pending;
  if (!response.ok())
    throw new Error(`Suggestions failed: HTTP ${response.status()}`);
  const data = await response.json();
  await page.getByRole('button', { name: '继续下一阶段' }).waitFor();
  await page.waitForFunction(
    () => {
      const img = document.querySelector('[aria-label="当前角色头像"] img');
      return (
        img instanceof HTMLImageElement && img.complete && img.naturalWidth > 1
      );
    },
    undefined,
    { timeout: 25000 },
  );
  await page.screenshot({
    path: 'test-results/live-avatar-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/live-avatar-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  if (external.length)
    throw new Error('Browser contacted an external AI/image provider');
  console.log(
    JSON.stringify({
      subjects: data.subjects.map((entry) => entry.emoji),
      traits: data.traits.map((entry) => entry.emoji),
      validPairs: data.pairs.length,
      externalBrowserRequests: external.length,
      imageLoaded: true,
    }),
  );
} finally {
  await browser.close();
}
