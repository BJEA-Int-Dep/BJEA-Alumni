import { expect, test, type Page } from '@playwright/test';
import { buildSuggestions } from '../server/kitchen';
import { PERSONALITIES } from '../src/features/onboarding/options';
import type { SuggestionRequest } from '../shared/avatar';

const entries = (...emojis: string[]) =>
  emojis.map((emoji) => ({ emoji, reason: `属于你的 ${emoji} 灵感` }));
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=',
  'base64',
);

async function setup(
  page: Page,
  recommendations = ['🐱', '🐶', '🦊', '🔥', '🌟', '🙃'],
) {
  await page.route('**/api/avatar/images/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: png }),
  );
  await page.route('**/api/avatar/emojis*', (route) => {
    const withEmoji = new URL(route.request().url()).searchParams.get('with');
    return route.fulfill({
      json: {
        emojis: withEmoji ? recommendations : [...recommendations, '🐼', '🐰'],
      },
    });
  });
  await page.route('**/api/avatar/suggestions', (route) => {
    return route.fulfill({
      json: buildSuggestions({
        recommendations: entries(...recommendations),
        nicknameSuggestions: ['小行星', '周五下班', '十一号'],
      }),
    });
  });
}

async function reachNickname(page: Page) {
  await page.goto('/create');
  await page
    .getByRole('button', { name: new RegExp(PERSONALITIES[0].label) })
    .click();
  await page
    .getByRole('combobox', { name: '高中毕业年份' })
    .selectOption('2024');
  await page.getByRole('button', { name: /已经工作/ }).click();
  await page.getByLabel('现在在哪里').fill('上海');
  await page.getByLabel('主要在做什么方向').fill('产品设计');
  await page.getByRole('button', { name: '下一题' }).click();
  await page
    .getByLabel('自己写一段真心话')
    .fill('边走边看，也在慢慢找到答案。');
  await page.getByRole('button', { name: '下一题' }).click();
  await page.getByLabel('给学弟学妹的话').fill('先试试看。');
  await page.getByRole('button', { name: '最后一步' }).click();
}

for (const mobile of [false, true]) {
  test(`七步创建流程支持卡片编辑和浏览器历史（${mobile ? 'mobile' : 'desktop'}）`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const requests: SuggestionRequest[] = [];
    page.on('request', (request) => {
      if (/gstatic|googleapis|openrouter/.test(request.url()))
        throw new Error(`browser contacted ${request.url()}`);
    });
    page.on('request', (request) => {
      if (request.url().endsWith('/api/avatar/suggestions'))
        requests.push(request.postDataJSON() as SuggestionRequest);
    });
    await setup(page);
    await reachNickname(page);
    await expect(
      page.getByRole('heading', { name: '给角色卡取个昵称' }),
    ).toBeVisible();
    await expect.poll(() => requests.length).toBe(1);
    await page.getByRole('button', { name: '打开角色卡详细编辑' }).click();
    await expect(page.getByText('角色卡详细信息')).toBeVisible();
    await page.getByRole('button', { name: /推荐 🐶/ }).click();
    await page.getByRole('button', { name: /推荐 🔥/ }).click();
    await page.getByRole('button', { name: '完成编辑' }).click();
    await page.getByLabel('角色卡昵称').fill('宇宙猫');
    await page.getByRole('button', { name: '使用这个昵称' }).click();
    await expect(page).toHaveURL(/\/profile\/my-profile$/);
    await page.goBack();
    await expect(page.getByLabel('角色卡昵称')).toHaveValue('宇宙猫');
    await page.goForward();
    await expect(page).toHaveURL(/\/profile\/my-profile$/);
    expect(requests[0].answers.nickname).toBe('');
    expect(requests[0].answers).toMatchObject({
      year: '2024',
      status: '已经工作',
      place: '上海',
      direction: '产品设计',
      reflection: '边走边看，也在慢慢找到答案。',
      advice: '先试试看。',
    });
  });
}

test('AI failure does not block the final nickname step', async ({ page }) => {
  await page.route('**/api/avatar/emojis*', (route) =>
    route.fulfill({ json: { emojis: ['🐱', '🔥'] } }),
  );
  await page.route('**/api/avatar/suggestions', (route) =>
    route.fulfill({ status: 502, json: { error: '测试：推荐暂不可用。' } }),
  );
  await reachNickname(page);
  await expect(page.getByRole('alert')).toContainText('推荐暂不可用');
  await page.getByLabel('角色卡昵称').fill('仍然可以完成');
  await page.getByRole('button', { name: '使用这个昵称' }).click();
  await expect(page).toHaveURL(/\/profile\/my-profile$/);
});
