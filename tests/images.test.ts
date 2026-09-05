import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { decodeEmoji, imageBytes } from '../server/images.ts';
import { upstreamImages } from '../server/kitchen.ts';

test('image cache retries stored orientations, deduplicates downloads and survives a cache reread', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'bjea-image-test-'));
  const oldDir = process.env.EMOJI_CACHE_DIR;
  process.env.EMOJI_CACHE_DIR = dir;
  t.after(async () => {
    if (oldDir === undefined) delete process.env.EMOJI_CACHE_DIR;
    else process.env.EMOJI_CACHE_DIR = oldDir;
    await rm(dir, { recursive: true });
  });
  const urls = upstreamImages('🐱', '💫');
  assert.ok(urls.length >= 2);
  assert.deepEqual(upstreamImages('💫', '🐱'), urls);
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const seen: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    seen.push(url);
    return url === urls[0]
      ? new Response('', { status: 404 })
      : new Response(png, { headers: { 'Content-Type': 'image/png' } });
  });
  const [first, concurrent] = await Promise.all([
    imageBytes('🐱', '💫'),
    imageBytes('💫', '🐱'),
  ]);
  assert.equal(seen.length, 2);
  assert.deepEqual(first.bytes, png);
  assert.equal(first.hash, concurrent.hash);
  const cached = await imageBytes('🐱', '💫');
  assert.equal(cached.cached, true);
  assert.equal(seen.length, 2);
  assert.equal(
    (await readdir(dir)).filter((name) => name.endsWith('.png')).length,
    1,
  );
  assert.ok(seen.every((url) => new URL(url).hostname === 'www.gstatic.com'));
});

test('rejects invalid image inputs without any network request', async () => {
  assert.throws(() => decodeEmoji('../etc/passwd'));
  assert.throws(() => decodeEmoji('110000'));
  assert.throws(() => decodeEmoji('d800'));
  assert.equal(decodeEmoji('1f431'), '🐱');
  await assert.rejects(imageBytes('https://localhost', '🔥'), /无法组合/);
});

test('does not cache a non-PNG or oversized upstream response', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'bjea-image-invalid-'));
  const oldDir = process.env.EMOJI_CACHE_DIR;
  process.env.EMOJI_CACHE_DIR = dir;
  t.after(async () => {
    if (oldDir === undefined) delete process.env.EMOJI_CACHE_DIR;
    else process.env.EMOJI_CACHE_DIR = oldDir;
    await rm(dir, { recursive: true });
  });
  const mock = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response('not-png', { headers: { 'Content-Type': 'image/png' } }),
  );
  await assert.rejects(imageBytes('🐶', '🔥'), /格式异常/);
  mock.mock.mockImplementation(
    async () =>
      new Response('huge', {
        headers: { 'Content-Type': 'image/png', 'Content-Length': '1048577' },
      }),
  );
  await assert.rejects(imageBytes('🐶', '🌟'), /大小异常/);
  assert.equal((await readdir(dir)).length, 0);
});
