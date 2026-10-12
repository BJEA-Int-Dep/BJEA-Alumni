import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

try { loadEnvFile('.env'); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const root = fileURLToPath(new URL('./', import.meta.url));
const model = 'openai/gpt-image-2.5-sunburst';
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('Set OPENROUTER_API_KEY locally.');

const common = `Create exactly one original fictional non-human avatar for a school alumni profile. Subject: one friendly small apricot fox holding one small simplified muted-coral laptop, with a curious smile. The laptop is the only accessory. Center a complete, compact full-body silhouette within the middle 76% of a square canvas, suitable for a circular avatar and recognizable at 32 pixels. Use a genuinely transparent alpha background: no painted background, gradient, vignette, halo, aura, drop shadow, floor, scenery, or checkerboard. No lettering, logo, watermark, extra character, floating decoration, or additional prop. This is a friendly illustrated icon, not a photo or cinematic character render.`;
const cases = {
  '01-report-style': {
    label: '报告风格：哑光 2.5D 贴纸',
    style: `Soft matte 2.5D rounded emoji-sticker illustration matching a cohesive avatar set. Warm charcoal outline of consistent medium thickness around the silhouette and major shapes. Large rounded head and compact body, simple dot eyes and a tiny curved mouth, restrained pastel colors, very soft upper-left lighting. Use smooth color regions and only subtle cel-like shading. Absolutely no individual fur strands, pores, fabric grain, shiny plastic, glossy highlights, realistic material textures, dramatic lighting, depth of field, or intricate small details.`,
  },
  '02-simple-emoji': {
    label: '更简洁的 emoji 图标：柔和 2.5D',
    style: `Minimal modern emoji icon illustration, with broad smooth rounded shapes and a friendly oversized face. Three or four clean color areas, simple dark dot eyes, tiny mouth, and one readable laptop shape. Gentle restrained 2.5D shading with no visible texture; nearly flat at thumbnail size. No dark contour outline, no fur strands, no realistic materials, no glossy specular lighting, no tiny details, and no cinematic rendering.`,
  },
};

const id = process.argv[2];
if (!Object.hasOwn(cases, id)) throw new Error(`Choose one case: ${Object.keys(cases).join(', ')}`);
const requestPath = new URL(`${id}.request.json`, import.meta.url);
try { await readFile(requestPath); throw new Error('This case was already requested; refusing duplicate billing.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const prior = [];
for (const priorId of Object.keys(cases)) {
  try { prior.push(JSON.parse(await readFile(new URL(`${priorId}.result.json`, import.meta.url), 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (prior.some((item) => item.status !== 200 || typeof item.cost !== 'number'))
  throw new Error('Review failed or unknown-cost request before spending more.');
if (prior.reduce((sum, item) => sum + item.cost, 0) >= 0.08)
  throw new Error('Study spending ceiling reached.');

const prompt = `${common}\n\n${cases[id].style}`;
const body = { model, prompt, n: 1, aspect_ratio: '1:1', quality: 'medium', background: 'transparent' };
await writeFile(requestPath, JSON.stringify({ id, label: cases[id].label, requested_at: new Date().toISOString(), endpoint: 'https://openrouter.ai/api/v1/images', body }, null, 2) + '\n');
const started = performance.now();
try {
  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const result = await response.json();
  const item = result.data?.[0];
  if (!response.ok || !item?.b64_json || item.media_type !== 'image/png')
    throw new Error(`Image request failed (${response.status}); billing status may be unknown.`);
  const bytes = Buffer.from(item.b64_json, 'base64');
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes[25] !== 6)
    throw new Error('Response was not an RGBA PNG; billing status may be unknown.');
  await writeFile(new URL(`${id}.png`, import.meta.url), bytes, { flag: 'wx' });
  const saved = {
    id,
    completed_at: new Date().toISOString(),
    status: response.status,
    elapsed_ms: Math.round(performance.now() - started),
    cost: result.usage?.cost ?? null,
    image: { bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: createHash('sha256').update(bytes).digest('hex') },
  };
  await writeFile(new URL(`${id}.result.json`, import.meta.url), JSON.stringify(saved, null, 2) + '\n');
  console.log(JSON.stringify(saved));
} catch (error) {
  await writeFile(new URL(`${id}.result.json`, import.meta.url), JSON.stringify({ id, status: null, elapsed_ms: Math.round(performance.now() - started), error: error.message, billing_status: 'unknown; no automatic retry' }, null, 2) + '\n');
  throw error;
}
