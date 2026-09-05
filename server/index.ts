import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { createHash } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';
import { suggestionRequestSchema, type Suggestions } from '../shared/avatar.ts';
import { ApiError, suggest } from './openrouter.ts';
import { decodeEmoji, imageBytes } from './images.ts';

try {
  loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export function createApiServer(
  providers: { suggest?: typeof suggest; image?: typeof imageBytes } = {},
) {
  const requests = new Map<string, { count: number; expires: number }>();
  const cache = new Map<
    string,
    { promise: Promise<Suggestions>; expires: number }
  >();
  let active = 0;
  let daily = { date: '', count: 0 };

  function json(res: ServerResponse, status: number, value: unknown) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(value));
  }

  async function readBody(req: IncomingMessage) {
    if (!req.headers['content-type']?.startsWith('application/json'))
      throw new ApiError(415, '请使用 JSON 请求。');
    let length = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 12000) throw new ApiError(413, '填写内容过长。');
      chunks.push(chunk);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      throw new ApiError(400, '请求格式不正确。');
    }
  }

  function clientIp(req: IncomingMessage) {
    const remote = req.socket.remoteAddress || 'unknown';
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote);
    return local && typeof req.headers['x-real-ip'] === 'string'
      ? req.headers['x-real-ip']
      : remote;
  }

  function limit(key: string, max: number) {
    const now = Date.now();
    for (const [id, entry] of requests)
      if (entry.expires < now) requests.delete(id);
    if (!requests.has(key)) {
      if (requests.size >= 5000)
        throw new ApiError(429, '访问人数较多，请稍后重试。');
      requests.set(key, { count: 0, expires: now + 3600000 });
    }
    if (++requests.get(key)!.count > max)
      throw new ApiError(429, '操作太频繁，请稍后再试。');
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/api/health')
        return json(res, 200, { ok: true });
      if (
        req.method === 'GET' &&
        url.pathname.startsWith('/api/avatar/images/')
      ) {
        limit(`image:${clientIp(req)}`, 600);
        const match =
          /^\/api\/avatar\/images\/([0-9a-f-]+)_([0-9a-f-]+)\.png$/.exec(
            url.pathname,
          );
        if (!match) throw new ApiError(400, '图片路径不正确。');
        const image = await (providers.image ?? imageBytes)(
          decodeEmoji(match[1]),
          decodeEmoji(match[2]),
        );
        const headers = {
          'Content-Type': 'image/png',
          'Cache-Control':
            'public, max-age=86400, stale-while-revalidate=604800',
          'X-Content-Type-Options': 'nosniff',
          ETag: `"${image.hash}"`,
          'X-Emoji-Cache': image.cached ? 'HIT' : 'MISS',
        };
        if (req.headers['if-none-match'] === headers.ETag) {
          res.writeHead(304, headers);
          return res.end();
        }
        res.writeHead(200, {
          ...headers,
          'Content-Length': image.bytes.length,
        });
        return res.end(image.bytes);
      }
      if (req.method !== 'POST' || url.pathname !== '/api/avatar/suggestions')
        throw new ApiError(404, '接口不存在。');
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        throw new ApiError(403, '请从本站提交请求。');
      const parsed = suggestionRequestSchema.safeParse(await readBody(req));
      if (!parsed.success)
        throw new ApiError(400, '填写内容格式不正确或过长。');
      const input = parsed.data;
      // Send only the information unlocked at this stage, even if a caller sends future answers.
      if (input.stage < 3) {
        delete input.answers.reflection;
        delete input.answers.advice;
      }
      if (input.stage < 2) {
        delete input.answers.year;
        delete input.answers.status;
        delete input.answers.place;
        delete input.answers.direction;
      }
      const ip = clientIp(req);
      const key = createHash('sha256')
        .update(ip + JSON.stringify(input))
        .digest('hex');
      for (const [id, item] of cache)
        if (item.expires < Date.now()) cache.delete(id);
      if (!cache.has(key)) {
        limit(`suggest:${ip}`, 30);
        const today = new Date().toISOString().slice(0, 10);
        if (daily.date !== today) daily = { date: today, count: 0 };
        if (daily.count >= Number(process.env.AVATAR_DAILY_LIMIT || 300))
          throw new ApiError(
            429,
            '今天的头像推荐额度已用完，现有头像仍可使用。',
          );
        if (active >= 3)
          throw new ApiError(503, '头像推荐正在忙，请稍后重试。');
        daily.count++;
        active++;
        const promise = (providers.suggest ?? suggest)(input).finally(() => {
          active--;
        });
        if (cache.size >= 300) cache.delete(cache.keys().next().value!);
        cache.set(key, { promise, expires: Date.now() + 10 * 60000 });
        void promise.catch(() => cache.delete(key));
      }
      json(res, 200, await cache.get(key)!.promise);
    } catch (error) {
      const known = error instanceof ApiError;
      if (!known)
        console.warn(
          `[avatar] ${error instanceof Error ? error.name : 'RequestError'}`,
        );
      json(res, known ? error.status : 502, {
        error: known
          ? error.message
          : '服务暂时不可用，当前选择已保留，请稍后重试。',
      });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  createApiServer().listen(
    Number(process.env.API_PORT || 8787),
    process.env.API_HOST || '127.0.0.1',
    () =>
      console.info(
        '[avatar] API listening on port ' + (process.env.API_PORT || 8787),
      ),
  );
}
