import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../server/worker.ts';

const environment = {
  ASSETS: {
    fetch: async (request: Request | URL | string) => {
      const url = new URL(String(request), 'https://example.test');
      return url.pathname === '/index.html'
        ? new Response('<main>site</main>', {
            headers: { 'Content-Type': 'text/html' },
          })
        : new Response('missing', { status: 404 });
    },
  },
};

test('worker serves API routes and falls back to the SPA entry', async () => {
  const health = await worker.fetch(
    new Request('https://example.test/api/health'),
    environment,
  );
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });

  const compatible = await worker.fetch(
    new Request(
      `https://example.test/api/avatar/emojis?with=${encodeURIComponent('🐱')}`,
    ),
    environment,
  );
  assert.equal(compatible.status, 200);
  assert.ok(
    ((await compatible.json()) as { emojis: string[] }).emojis.includes('🔥'),
  );

  const page = await worker.fetch(
    new Request('https://example.test/profile'),
    environment,
  );
  assert.equal(page.status, 200);
  assert.equal(await page.text(), '<main>site</main>');
});
