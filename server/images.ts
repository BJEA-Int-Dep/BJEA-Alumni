import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ApiError } from './errors.ts';
import { upstreamImages } from './kitchen.ts';

const pending = new Map<string, Promise<Buffer>>();
const missing = new Map<string, number>();
const MAX_BYTES = 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodeEmoji(code: string) {
  if (!/^[0-9a-f]{2,6}(?:-[0-9a-f]{2,6}){0,9}$/.test(code))
    throw new ApiError(400, '无效的 emoji。');
  const points = code.split('-').map((part) => parseInt(part, 16));
  if (
    points.some(
      (point) => point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff),
    )
  )
    throw new ApiError(400, '无效的 emoji。');
  return String.fromCodePoint(...points);
}

export async function imageBytes(subject: string, trait: string) {
  const urls = upstreamImages(subject, trait);
  if (!urls.length) throw new ApiError(404, '这两个 emoji 暂时无法组合。');
  // Same canonical key for A+B and B+A; changes when the package's releases change.
  const hash = createHash('sha256').update(urls.join('\n')).digest('hex');
  const dir = resolve(process.env.EMOJI_CACHE_DIR || '.cache/emoji');
  const path = resolve(dir, `${hash}.png`);
  try {
    return { bytes: await readFile(path), hash, cached: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (!pending.has(hash)) {
    if (pending.size >= 8)
      throw new ApiError(503, '头像加载繁忙，请稍后重试。');
    const download = (async () => {
      const signal = AbortSignal.timeout(15000);
      for (const [url, expiry] of missing)
        if (expiry < Date.now()) missing.delete(url);
      let response: Response | undefined;
      for (const url of urls) {
        if (missing.has(url)) continue;
        const candidate = await fetch(url, { redirect: 'error', signal });
        if (candidate.status === 404) {
          await candidate.body?.cancel();
          if (missing.size >= 5000)
            missing.delete(missing.keys().next().value!);
          missing.set(url, Date.now() + 3600000);
          continue;
        }
        response = candidate;
        break;
      }
      if (!response)
        throw new ApiError(404, '这个组合的图片暂时不可用，请试试另一组。');
      if (
        !response.ok ||
        !response.headers.get('content-type')?.startsWith('image/png') ||
        !response.body
      )
        throw new ApiError(502, '头像图片暂时加载失败。');
      if (Number(response.headers.get('content-length')) > MAX_BYTES) {
        await response.body.cancel();
        throw new ApiError(502, '头像图片大小异常。');
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          throw new ApiError(502, '头像图片大小异常。');
        }
        chunks.push(value);
      }
      const bytes = Buffer.concat(chunks);
      if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE))
        throw new ApiError(502, '头像图片格式异常。');
      await mkdir(dir, { recursive: true });
      // Bound cache growth; continue serving valid images even when the disk cache is full.
      if (
        (await readdir(dir)).filter((name) => name.endsWith('.png')).length <
        1000
      ) {
        const temporary = resolve(dir, `${hash}.${randomUUID()}.tmp`);
        await writeFile(temporary, bytes, { flag: 'wx' });
        await rename(temporary, path);
      }
      return bytes;
    })();
    pending.set(hash, download);
    void download.finally(() => pending.delete(hash)).catch(() => {});
  }
  return { bytes: await pending.get(hash)!, hash, cached: false };
}
