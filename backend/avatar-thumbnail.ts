import { execFile } from 'node:child_process';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

const run = promisify(execFile);
const pending = new Map<string, Promise<Buffer>>();
const resize = `
import sys
from PIL import Image
with Image.open(sys.argv[1]) as image:
    image = image.convert('RGBA')
    image.thumbnail((256, 256), Image.Resampling.LANCZOS)
    image.save(sys.stdout.buffer, format='WEBP', quality=75, method=4)
`;

// Existing and newly generated avatars share the same on-demand thumbnail cache.
export function avatarThumbnail(originalPath: string): Promise<Buffer> {
  const existing = pending.get(originalPath);
  if (existing) return existing;
  const thumbnailPath = originalPath.replace(/\.png$/, '.thumb.webp');
  const task = (async () => {
    try {
      return await readFile(thumbnailPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const { stdout } = await run('python3', ['-c', resize, originalPath], {
      encoding: 'buffer', timeout: 15000, maxBuffer: 1024 * 1024,
    });
    const temporaryPath = `${thumbnailPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, stdout, { flag: 'wx' });
      await rename(temporaryPath, thumbnailPath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
    return stdout;
  })().finally(() => pending.delete(originalPath));
  pending.set(originalPath, task);
  return task;
}
