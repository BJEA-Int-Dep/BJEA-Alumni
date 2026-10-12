import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { avatarImagePrompt } from '../../backend/generated-avatar.ts';

try { loadEnvFile('.env'); } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('Set OPENROUTER_API_KEY locally.');
const requestFile = new URL('./03-other-subject.request.json', import.meta.url);
try {
  await readFile(requestFile);
  throw new Error('This case was already requested; refusing duplicate billing.');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const recipe = { subject: '一片小吐司', detail: '举着一块小调色盘' };
const body = {
  model: 'openai/gpt-image-2.5-sunburst',
  prompt: avatarImagePrompt(recipe, 'lemon'),
  n: 1,
  aspect_ratio: '1:1',
  quality: 'medium',
  background: 'transparent',
};
await writeFile(requestFile, JSON.stringify({ recipe, requested_at: new Date().toISOString(), body }, null, 2) + '\n');
const started = performance.now();
try {
  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const result = await response.json() as {
    data?: Array<{ b64_json?: string; media_type?: string }>;
    usage?: { cost?: number };
  };
  const item = result.data?.[0];
  if (!response.ok || !item?.b64_json || item.media_type !== 'image/png')
    throw new Error(`Image request failed (${response.status}); billing status may be unknown.`);
  const bytes = Buffer.from(item.b64_json, 'base64');
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes[25] !== 6)
    throw new Error('Response was not an RGBA PNG; billing status may be unknown.');
  await writeFile(new URL('./03-other-subject.png', import.meta.url), bytes, { flag: 'wx' });
  const saved = {
    status: response.status,
    elapsed_ms: Math.round(performance.now() - started),
    cost: result.usage?.cost ?? null,
    image: {
      bytes: bytes.length,
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    },
  };
  await writeFile(new URL('./03-other-subject.result.json', import.meta.url), JSON.stringify(saved, null, 2) + '\n');
  console.log(JSON.stringify(saved));
} catch (error) {
  await writeFile(new URL('./03-other-subject.result.json', import.meta.url), JSON.stringify({ status: null, error: error instanceof Error ? error.message : 'Unknown error', billing_status: 'unknown; no automatic retry' }, null, 2) + '\n');
  throw error;
}
