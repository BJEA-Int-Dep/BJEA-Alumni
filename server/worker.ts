import { suggestionRequestSchema, type Suggestions } from '../shared/avatar.ts';
import { ApiError } from './errors.ts';
import {
  compatibleEmojis,
  randomPair,
  supported,
  upstreamImages,
} from './kitchen.ts';
import {
  suggestWithEnvironment,
  type SuggestionEnvironment,
} from './openrouter.ts';

interface AssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>;
}

interface Environment extends SuggestionEnvironment {
  ASSETS: AssetsBinding;
  AVATAR_DAILY_LIMIT?: string;
}

const requests = new Map<string, { count: number; expires: number }>();
const suggestions = new Map<
  string,
  { promise: Promise<Suggestions>; expires: number }
>();
const pendingImages = new Map<string, Promise<ArrayBuffer>>();
let active = 0;
let daily = { date: '', count: 0 };

function decodeEmoji(code: string) {
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

function json(status: number, value: unknown) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function limit(key: string, max: number) {
  const now = Date.now();
  for (const [id, entry] of requests)
    if (entry.expires < now) requests.delete(id);
  const entry = requests.get(key) ?? { count: 0, expires: now + 3_600_000 };
  if (!requests.has(key)) {
    if (requests.size >= 5_000)
      throw new ApiError(429, '访问人数较多，请稍后重试。');
    requests.set(key, entry);
  }
  if (++entry.count > max) throw new ApiError(429, '操作太频繁，请稍后再试。');
}

async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, '请使用 JSON 请求。');
  if (Number(request.headers.get('content-length') || 0) > 12_000)
    throw new ApiError(413, '填写内容过长。');
  const text = await request.text();
  if (text.length > 12_000) throw new ApiError(413, '填写内容过长。');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, '请求格式不正确。');
  }
}

function clientIp(request: Request) {
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

async function imageResponse(firstCode: string, secondCode: string) {
  const first = decodeEmoji(firstCode);
  const second = decodeEmoji(secondCode);
  const urls = upstreamImages(first, second);
  if (!urls.length) throw new ApiError(404, '这两个 emoji 暂时无法组合。');
  const key = `${firstCode}_${secondCode}`;
  if (!pendingImages.has(key)) {
    if (pendingImages.size >= 8)
      throw new ApiError(503, '头像加载繁忙，请稍后重试。');
    const download = (async () => {
      for (const url of urls) {
        const response = await fetch(url, {
          redirect: 'error',
          signal: AbortSignal.timeout(15_000),
        });
        if (response.status === 404) continue;
        if (
          !response.ok ||
          !response.headers.get('content-type')?.startsWith('image/png')
        )
          throw new ApiError(502, '头像图片暂时加载失败。');
        if (Number(response.headers.get('content-length') || 0) > 1024 * 1024)
          throw new ApiError(502, '头像图片大小异常。');
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 1024 * 1024)
          throw new ApiError(502, '头像图片大小异常。');
        const signature = new Uint8Array(
          bytes,
          0,
          Math.min(8, bytes.byteLength),
        );
        if (
          signature.length !== 8 ||
          ![137, 80, 78, 71, 13, 10, 26, 10].every(
            (value, index) => signature[index] === value,
          )
        )
          throw new ApiError(502, '头像图片格式异常。');
        return bytes;
      }
      throw new ApiError(404, '这个组合的图片暂时不可用，请试试另一组。');
    })();
    pendingImages.set(key, download);
    void download.finally(() => pendingImages.delete(key)).catch(() => {});
  }
  const bytes = await pendingImages.get(key)!;
  return new Response(bytes, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': 'image/png',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function requestKey(ip: string, input: unknown) {
  const bytes = new TextEncoder().encode(`${ip}:${JSON.stringify(input)}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

async function api(request: Request, environment: Environment) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/health')
    return json(200, { ok: true });
  if (request.method === 'GET' && url.pathname === '/api/avatar/emojis') {
    const withEmoji = url.searchParams.get('with');
    if (!withEmoji) return json(200, { emojis: supported });
    const emojis = compatibleEmojis(withEmoji);
    if (!emojis.length) throw new ApiError(400, '这个 emoji 暂时无法组合。');
    return json(200, { emojis });
  }
  if (request.method === 'GET' && url.pathname === '/api/avatar/random') {
    const pair = randomPair();
    if (!pair) throw new ApiError(503, '暂时找不到可用组合，请稍后重试。');
    return json(200, pair);
  }
  if (
    request.method === 'GET' &&
    url.pathname.startsWith('/api/avatar/images/')
  ) {
    limit(`image:${clientIp(request)}`, 600);
    const match =
      /^\/api\/avatar\/images\/([0-9a-f-]+)_([0-9a-f-]+)\.png$/.exec(
        url.pathname,
      );
    if (!match) throw new ApiError(400, '图片路径不正确。');
    return imageResponse(match[1], match[2]);
  }
  if (request.method !== 'POST' || url.pathname !== '/api/avatar/suggestions')
    throw new ApiError(404, '接口不存在。');
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== url.host)
    throw new ApiError(403, '请从本站提交请求。');
  const parsed = suggestionRequestSchema.safeParse(await readBody(request));
  if (!parsed.success) throw new ApiError(400, '填写内容格式不正确或过长。');
  const input = parsed.data;
  const ip = clientIp(request);
  const key = await requestKey(ip, input);
  for (const [id, item] of suggestions)
    if (item.expires < Date.now()) suggestions.delete(id);
  if (!suggestions.has(key)) {
    limit(`suggest:${ip}`, 30);
    const today = new Date().toISOString().slice(0, 10);
    if (daily.date !== today) daily = { date: today, count: 0 };
    if (daily.count >= Number(environment.AVATAR_DAILY_LIMIT || 300))
      throw new ApiError(429, '今天的头像推荐额度已用完，现有头像仍可使用。');
    if (active >= 3) throw new ApiError(503, '头像推荐正在忙，请稍后重试。');
    daily.count++;
    active++;
    const promise = suggestWithEnvironment(input, environment).finally(() => {
      active--;
    });
    if (suggestions.size >= 300)
      suggestions.delete(suggestions.keys().next().value!);
    suggestions.set(key, { promise, expires: Date.now() + 10 * 60_000 });
    void promise.catch(() => suggestions.delete(key));
  }
  return json(200, await suggestions.get(key)!.promise);
}

export default {
  async fetch(request: Request, environment: Environment) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      const response = await environment.ASSETS.fetch(request);
      if (response.status !== 404 || !['GET', 'HEAD'].includes(request.method))
        return response;
      return environment.ASSETS.fetch(new URL('/index.html', request.url));
    }
    try {
      return await api(request, environment);
    } catch (error) {
      const known = error instanceof ApiError;
      if (!known)
        console.warn(
          `[avatar] ${error instanceof Error ? error.name : 'RequestError'}`,
        );
      return json(known ? error.status : 502, {
        error: known
          ? error.message
          : '服务暂时不可用，当前选择已保留，请稍后重试。',
      });
    }
  },
};
