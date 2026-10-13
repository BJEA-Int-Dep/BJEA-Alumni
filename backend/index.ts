import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { handleAdminRequest } from './admin.ts';
import { canPublishProfile, profileDraftSchema } from '../shared/account.ts';
import { generatedAvatarPath } from '../shared/avatar.ts';
import { openDatabase, type AppDatabase } from './database.ts';
import { suggestNicknames } from './nicknames.ts';
import { createGeneratedAvatarService } from './generated-avatar.ts';
import { ApiError } from './errors.ts';
import { handleAuthRequest } from './routes/auth.ts';
import { handleCommentsRequest } from './routes/comments.ts';
import { handleProfilesRequest } from './routes/profiles.ts';
import { createAvatarRoutes } from './routes/avatar.ts';
import { createNicknameRoutes } from './routes/nicknames.ts';

try {
  loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export function createApiServer(
  providers: {
    suggestNicknames?: typeof suggestNicknames;
    database?: AppDatabase;
  } = {},
) {
  const database = providers.database ?? openDatabase();
  const generatedAvatars = createGeneratedAvatarService(database);
  const requests = new Map<string, { count: number; expires: number }>();
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

  function sameOrigin(req: IncomingMessage) {
    if (
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      throw new ApiError(403, '请从本站提交请求。');
  }

  function parsedBody<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success)
      throw new ApiError(
        400,
        result.error.issues[0]?.message || '填写内容格式不正确。',
      );
    return result.data;
  }

  function savedDraft(userId: number) {
    const row = database
      .prepare('SELECT draft_json FROM profiles WHERE user_id = ?')
      .get(userId) as { draft_json: string } | undefined;
    if (!row) return null;
    const parsed = profileDraftSchema.safeParse(JSON.parse(row.draft_json));
    return parsed.success ? parsed.data : null;
  }

  function publicProfileDraft(profileId: string) {
    const member = /^member-(\d+)$/.exec(profileId);
    let row: { draft_json: string } | undefined;
    if (member) row = database.prepare("SELECT profiles.draft_json FROM profiles JOIN users ON users.id = profiles.user_id WHERE profiles.user_id = ? AND users.account_status = 'active' AND users.public_profile = 1").get(Number(member[1])) as { draft_json: string } | undefined;
    const example = /^example-([a-z0-9-]+)$/.exec(profileId);
    if (example) row = database.prepare('SELECT draft_json FROM example_profiles WHERE id = ?').get(example[1]) as { draft_json: string } | undefined;
    if (!row) return null;
    const parsed = profileDraftSchema.safeParse(JSON.parse(row.draft_json));
    return parsed.success && canPublishProfile(parsed.data) ? parsed.data : null;
  }

  function commentAvatar(draft: ReturnType<typeof savedDraft>) {
    const avatar = draft?.avatar;
    return {
      avatarImageUrl: avatar?.generatedAssetId
        ? generatedAvatarPath(avatar.generatedAssetId)
        : undefined,
    };
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

  const handleAvatarRequest = createAvatarRoutes();
  const handleNicknameRequest = createNicknameRoutes(providers.suggestNicknames);

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/api/health')
        return json(res, 200, { ok: true });
      if (
        await handleAdminRequest({
          req,
          res,
          url,
          database,
          json,
          readBody,
          sameOrigin,
          limit,
          clientIp,
        })
      )
        return;
      const context = {
        req, res, url, database, generatedAvatars,
        json, readBody, sameOrigin, parsedBody, clientIp, limit,
        savedDraft, publicProfileDraft, commentAvatar,
      };
      if (await handleAuthRequest(context)) return;
      if (await handleCommentsRequest(context)) return;
      if (await handleProfilesRequest(context)) return;
      if (await handleAvatarRequest(context)) return;
      if (await handleNicknameRequest(context)) return;
      throw new ApiError(404, '接口不存在。');
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
