import { test, expect, type Page } from '@playwright/test';
import { buildSuggestions } from '../server/kitchen';
import {
  PERSONALITIES,
  REFLECTION_OPTIONS,
  STATUS_OPTIONS,
} from '../src/features/onboarding/options';
import type { SuggestionRequest } from '../shared/avatar';

const entries = (...emojis: string[]) =>
  emojis.map((emoji) => ({ emoji, reason: `属于你的 ${emoji} 灵感` }));
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=',
  'base64',
);

async function firstStage(page: Page) {
  await page.goto('/create');
  await page
    .getByRole('button', { name: new RegExp(PERSONALITIES[0].label) })
    .click();
  await page.getByPlaceholder('例如：Matcha、小岛、北纬 39°').fill('宇宙猫');
  await page.getByRole('button', { name: '就叫这个' }).click();
  await page.getByRole('button', { name: /尽管猎奇/ }).click();
  await page.getByRole('button', { name: '完成第一阶段' }).click();
}

for (const mobile of [false, true]) {
  test(`three stages preserve selections, update candidates and support browser history (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const requests: SuggestionRequest[] = [];
    const external: string[] = [];
    const errors: string[] = [];
    page.on('request', (req) => {
      if (/gstatic|googleapis|openrouter/.test(req.url()))
        external.push(req.url());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/avatar/images/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: png }),
    );
    await page.route('**/api/avatar/suggestions', (route) => {
      const input = route.request().postDataJSON() as SuggestionRequest;
      requests.push(input);
      return route.fulfill({
        json: buildSuggestions(
          input.stage === 1
            ? {
                subjects: entries('🐱', '🐶', '🦊'),
                traits: entries('🔥', '🌟', '🙃'),
              }
            : {
                subjects: entries('🐼', '🐰', '🦄'),
                traits: entries('🌈', '💫', '🤓'),
              },
          input.selection,
        ),
      });
    });
    await firstStage(page);
    await expect(page.getByRole('region', { name: '主体候选' })).toBeVisible();
    await page.getByRole('button', { name: /^主体 🐶/ }).click();
    await page.getByRole('button', { name: /^特征 🔥/ }).click();
    await expect(page.getByRole('button', { name: '解锁主体' })).toBeVisible();
    await expect(page.getByRole('button', { name: '解锁特征' })).toBeVisible();
    await page.getByRole('button', { name: '继续下一阶段' }).click();
    await page.getByRole('button', { name: '2024', exact: true }).click();
    await page
      .getByRole('button', {
        name: new RegExp(
          STATUS_OPTIONS.find((option) => option.id === 'private')!.label,
        ),
      })
      .click();
    await expect(
      page.getByRole('button', { name: /^主体 🐶/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: /^特征 🔥/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^主体 🐼/ })).toBeVisible();
    await page.getByRole('button', { name: '继续下一阶段' }).click();
    await page
      .getByRole('button', { name: new RegExp(REFLECTION_OPTIONS[0]) })
      .click();
    await page
      .getByPlaceholder('例如：别急着找到标准答案，先去试试看。')
      .fill('允许自己绕路。');
    await page.getByRole('button', { name: '生成我的 Profile' }).click();
    await expect(
      page.getByRole('button', { name: '使用这张角色卡' }),
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: /^主体 🐶/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.goBack();
    await expect(
      page.getByPlaceholder('例如：别急着找到标准答案，先去试试看。'),
    ).toHaveValue('允许自己绕路。');
    await page.goForward();
    await expect(
      page.getByRole('button', { name: /^特征 🔥/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(new Set(requests.map((request) => request.stage))).toEqual(
      new Set([1, 2, 3]),
    );
    expect(requests).toHaveLength(3);
    expect(requests[0].answers.style).toBe('wild');
    expect(
      requests.find((request) => request.stage === 1)!.answers.advice,
    ).toBeUndefined();
    expect(
      requests.find((request) => request.stage === 3)!.answers.advice,
    ).toBe('允许自己绕路。');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/checkpoint-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: '使用这张角色卡' }).click();
    await expect(page).toHaveURL(/\/profile\/my-profile$/);
    await expect(
      page.getByRole('img', { name: /宇宙猫 的角色头像/ }).locator('img'),
    ).toHaveAttribute('src', '/api/avatar/images/1f436_1f525.png');
    await page.reload();
    await expect(
      page.getByRole('img', { name: /宇宙猫 的角色头像/ }).locator('img'),
    ).toHaveAttribute('src', '/api/avatar/images/1f436_1f525.png');
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('API failure can be retried or skipped without trapping the user', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/api/avatar/suggestions', (route) => {
    requests++;
    return route.fulfill({
      status: 502,
      json: { error: '测试：推荐暂不可用，已有选择已保留。' },
    });
  });
  await firstStage(page);
  await expect(page.getByRole('alert')).toContainText('推荐暂不可用');
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect.poll(() => requests).toBeGreaterThan(1);
  await page.getByRole('button', { name: '继续下一阶段' }).click();
  await expect(
    page.getByRole('heading', { name: '你是哪一届毕业的？' }),
  ).toBeVisible();
});

test('image failure falls back visibly without losing the selected pair', async ({
  page,
}) => {
  await page.route('**/api/avatar/images/**', (route) =>
    route.fulfill({ status: 502 }),
  );
  await page.route('**/api/avatar/suggestions', (route) =>
    route.fulfill({
      json: buildSuggestions(
        {
          subjects: entries('🐱', '🐶', '🦊'),
          traits: entries('🔥', '🌟', '🙃'),
        },
        route.request().postDataJSON().selection,
      ),
    }),
  );
  await firstStage(page);
  await expect(page.getByRole('img', { name: '当前角色头像' })).toContainText(
    '图片暂不可用',
  );
  await expect(page.getByRole('button', { name: /^主体 🐱/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: '继续下一阶段' }),
  ).toBeEnabled();
});

test('public status collects location and direction before the second checkpoint', async ({
  page,
}) => {
  const requests: SuggestionRequest[] = [];
  await page.route('**/api/avatar/images/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: png }),
  );
  await page.route('**/api/avatar/suggestions', (route) => {
    const input = route.request().postDataJSON() as SuggestionRequest;
    requests.push(input);
    return route.fulfill({
      json: buildSuggestions(
        {
          subjects: entries('🐱', '🐶', '🦊'),
          traits: entries('🔥', '🌟', '🙃'),
        },
        input.selection,
      ),
    });
  });
  await firstStage(page);
  await page.getByRole('button', { name: '继续下一阶段' }).click();
  await page.getByRole('button', { name: '2024', exact: true }).click();
  await page.getByRole('button', { name: /还在大学/ }).click();
  await page
    .getByRole('button', { name: '北京的一所大学', exact: true })
    .click();
  await page.getByRole('button', { name: '下一题', exact: true }).click();
  await page.getByRole('button', { name: /计算机 \/ 工程/ }).click();
  await expect(
    page.getByRole('button', { name: '继续下一阶段' }),
  ).toBeEnabled();
  expect(requests).toHaveLength(2);
  expect(requests[1].answers).toMatchObject({
    year: '2024',
    status: '还在大学',
    place: '北京的一所大学',
    direction: '计算机 / 工程',
  });
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: '现在主要在做什么方向？' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByPlaceholder('或者自己写一句…')).toHaveValue(
    '北京的一所大学',
  );
});
