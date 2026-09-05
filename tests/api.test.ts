import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApiServer } from '../server/index.ts';
import { type SuggestionRequest } from '../shared/avatar.ts';

test('API validates suggestions, deduplicates requests, and serves cached images', async (t) => {
  const seen: SuggestionRequest[] = [];
  const server = createApiServer({
    suggest: async (input) => {
      seen.push(input);
      return {
        recommendations: [],
        nicknameSuggestions: ['小行星', '周五下班', '十一号'],
      };
    },
    image: async () => ({
      bytes: Buffer.from('test-image'),
      hash: 'abc',
      cached: true,
    }),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const addr = server.address();
  assert.ok(addr && typeof addr !== 'string');
  const base = `http://127.0.0.1:${addr.port}`;
  const input = {
    answers: {
      personality: '',
      nickname: '',
      year: '2024',
      status: '已经工作',
      place: 'future',
      advice: 'future',
    },
    refresh: 0,
  };
  const post = (body: unknown, headers = {}) =>
    fetch(`${base}/api/avatar/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  const emojiList = await fetch(`${base}/api/avatar/emojis`);
  assert.equal(emojiList.status, 200);
  const emojiData = (await emojiList.json()) as { emojis: string[] };
  assert.ok(emojiData.emojis.includes('🐱'));
  const compatible = await fetch(
    `${base}/api/avatar/emojis?with=${encodeURIComponent('🐱')}`,
  );
  assert.equal(compatible.status, 200);
  assert.ok(
    ((await compatible.json()) as { emojis: string[] }).emojis.includes('🔥'),
  );
  const random = await fetch(`${base}/api/avatar/random`);
  assert.equal(random.status, 200);
  assert.deepEqual(Object.keys(await random.json()).sort(), [
    'first',
    'second',
  ]);
  const responses = await Promise.all([post(input), post(input)]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].answers.place, 'future');
  assert.equal(seen[0].answers.advice, 'future');
  assert.equal((await post({ ...input, refresh: 1 })).status, 200);
  assert.equal(seen[1].answers.place, 'future');
  assert.equal((await post({ ...input, stage: 3 })).status, 400);
  assert.equal(
    (await post(input, { Origin: 'https://evil.example' })).status,
    403,
  );
  assert.equal(
    (await post(input, { 'Content-Type': 'text/plain' })).status,
    415,
  );
  const invalid = await fetch(`${base}/api/avatar/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(invalid.status, 400);
  assert.equal(
    (await fetch(`${base}/api/avatar/images/110000_1f431.png`)).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/api/avatar/images/https://evil.example`)).status,
    400,
  );
  const image = await fetch(`${base}/api/avatar/images/1f431_1f525.png`);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.equal(image.headers.get('x-emoji-cache'), 'HIT');
  assert.equal(
    (
      await fetch(`${base}/api/avatar/images/1f431_1f525.png`, {
        headers: { 'If-None-Match': '"abc"' },
      })
    ).status,
    304,
  );
  assert.equal((await fetch(`${base}/api/nonexistent`)).status, 404);
});

test('upstream failures return sanitized errors', async (t) => {
  const server = createApiServer({
    suggest: async () => {
      throw new Error('secret-provider-body');
    },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const addr = server.address();
  assert.ok(addr && typeof addr !== 'string');
  const response = await fetch(
    `http://127.0.0.1:${addr.port}/api/avatar/suggestions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          personality: '',
          nickname: '',
        },
        refresh: 0,
      }),
    },
  );
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes('secret-provider-body'), false);
});
