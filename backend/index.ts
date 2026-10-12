import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { handleAdminRequest } from './admin.ts';
import {
  accountPreferencesSchema,
  canPublishProfile,
  emailSchema,
  nicknameSchema,
  passwordSchema,
  profileDraftSchema,
  realNameSchema,
  verificationCodeSchema,
} from '../shared/account.ts';
import {
  nicknameSuggestionRequestSchema,
  suggestionRequestSchema,
  type NicknameSuggestions,
  type Suggestions,
} from '../shared/avatar.ts';
import {
  createSession,
  currentUser,
  deleteSession,
  emailKey,
  hashPassword,
  nicknameKey,
  passwordMatches,
  publicUser,
  requireUser,
  verificationCodeMatches,
} from './auth.ts';
import { openDatabase, type AppDatabase } from './database.ts';
import { suggest } from './openrouter.ts';
import { suggestNicknames } from './nicknames.ts';
import { ApiError } from './errors.ts';
import { decodeEmoji, imageBytes } from './images.ts';
import { compatibleEmojis, randomPair, supported } from './kitchen.ts';

try {
  loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const registerRequestSchema = z
  .object({
    realName: realNameSchema,
    email: emailSchema,
    code: verificationCodeSchema,
    preferences: accountPreferencesSchema,
  })
  .strict();
const loginRequestSchema = z
  .object({
    identifier: z.string().trim().min(1, '请输入邮箱或原登录昵称。').max(254),
    password: passwordSchema,
  })
  .strict();
const emailCodeRequestSchema = z
  .object({ email: emailSchema, code: verificationCodeSchema })
  .strict();
const resetPasswordRequestSchema = emailCodeRequestSchema
  .extend({ password: passwordSchema })
  .strict();
const sendCodeRequestSchema = z
  .object({
    email: emailSchema,
    purpose: z.enum(['login', 'register', 'recover-nickname', 'reset-password']),
  })
  .strict();

interface UserRow {
  id: number;
  nickname: string;
  real_name: string;
  email: string;
  password_hash: string;
  account_status: 'active' | 'disabled';
  has_profile: number;
  notify_major_events: number;
  notify_community_updates: number;
  public_profile: number;
}

interface ProfileRow {
  user_id: number;
  draft_json: string;
}

export function createApiServer(
  providers: {
    suggest?: typeof suggest;
    suggestNicknames?: typeof suggestNicknames;
    image?: typeof imageBytes;
    database?: AppDatabase;
  } = {},
) {
  const database = providers.database ?? openDatabase();
  const requests = new Map<string, { count: number; expires: number }>();
  const cache = new Map<
    string,
    { promise: Promise<Suggestions>; expires: number }
  >();
  const nicknameCache = new Map<
    string,
    { promise: Promise<NicknameSuggestions>; expires: number }
  >();
  let active = 0;
  let daily = { date: '', count: 0 };
  let activeNicknames = 0;
  let dailyNicknames = { date: '', count: 0 };

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
      if (
        req.method === 'GET' &&
        url.pathname === '/api/auth/nickname-availability'
      ) {
        limit(`availability:${clientIp(req)}`, 300);
        const result = nicknameSchema.safeParse(
          url.searchParams.get('nickname') || '',
        );
        if (!result.success)
          return json(res, 200, {
            valid: false,
            available: false,
            error: result.error.issues[0]?.message,
          });
        const occupied = database
          .prepare('SELECT 1 FROM users WHERE nickname_key = ?')
          .get(nicknameKey(result.data));
        return json(res, 200, {
          valid: true,
          available: !occupied,
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/auth/me') {
        const user = currentUser(database, req);
        return json(
          res,
          200,
          user
            ? { user: publicUser(user), draft: savedDraft(user.id) }
            : { user: null, draft: null },
        );
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/send-code') {
        sameOrigin(req);
        limit(`send-code:${clientIp(req)}`, 30);
        parsedBody(sendCodeRequestSchema, await readBody(req));
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/register') {
        sameOrigin(req);
        limit(`register:${clientIp(req)}`, 20);
        const input = parsedBody(registerRequestSchema, await readBody(req));
        if (!verificationCodeMatches(input.code))
          throw new ApiError(400, '验证码不正确。');
        const normalizedEmail = emailKey(input.email);
        if (
          database
            .prepare('SELECT 1 FROM users WHERE email_key = ?')
            .get(normalizedEmail)
        )
          throw new ApiError(409, '这个邮箱已经注册过了。');
        const legacyLoginName = `alumni_${randomBytes(10).toString('hex')}`;
        let inserted;
        try {
          inserted = database
            .prepare(
              `INSERT INTO users
                (nickname, nickname_key, email, email_key, password_hash,
                 real_name, notify_major_events, notify_community_updates,
                 public_profile, preferences_updated_at, created_at)
              VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              legacyLoginName,
              nicknameKey(legacyLoginName),
              input.email,
              normalizedEmail,
              input.realName,
              Number(input.preferences.notifyMajorEvents),
              Number(input.preferences.notifyCommunityUpdates),
              Number(input.preferences.publicProfile),
              Date.now(),
              Date.now(),
            );
        } catch {
          throw new ApiError(409, '这个邮箱已经注册过了。');
        }
        const user = {
          id: Number(inserted.lastInsertRowid),
          nickname: legacyLoginName,
          real_name: input.realName,
          email: input.email,
          password_hash: '',
          account_status: 'active',
          has_profile: 0,
          notify_major_events: Number(input.preferences.notifyMajorEvents),
          notify_community_updates: Number(input.preferences.notifyCommunityUpdates),
          public_profile: Number(input.preferences.publicProfile),
        } satisfies UserRow;
        createSession(database, res, user.id);
        return json(res, 201, { user: publicUser(user), draft: null });
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/email-login') {
        sameOrigin(req);
        limit(`email-login:${clientIp(req)}`, 60);
        const input = parsedBody(emailCodeRequestSchema, await readBody(req));
        if (!verificationCodeMatches(input.code))
          throw new ApiError(400, '验证码不正确。');
        const user = database
          .prepare(
            `SELECT users.id, users.nickname, users.real_name, users.email,
              users.password_hash, users.account_status,
              users.notify_major_events, users.notify_community_updates,
              users.public_profile,
              EXISTS(SELECT 1 FROM profiles WHERE profiles.user_id = users.id) AS has_profile
            FROM users WHERE email_key = ?`,
          )
          .get(emailKey(input.email)) as UserRow | undefined;
        if (!user)
          throw new ApiError(404, '这个邮箱还没有 Profile，请先创建。');
        if (user.account_status === 'disabled')
          throw new ApiError(403, '账号已停用，请联系学校老师。');
        createSession(database, res, user.id);
        return json(res, 200, {
          user: publicUser(user),
          draft: savedDraft(user.id),
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        sameOrigin(req);
        limit(`login:${clientIp(req)}`, 60);
        const input = parsedBody(loginRequestSchema, await readBody(req));
        const identifier = input.identifier.trim();
        const user = database
          .prepare(
            `SELECT users.id, users.nickname, users.real_name, users.email,
              users.password_hash,
              users.account_status,
              users.notify_major_events, users.notify_community_updates,
              users.public_profile,
              EXISTS(SELECT 1 FROM profiles WHERE profiles.user_id = users.id) AS has_profile
            FROM users WHERE email_key = ? OR nickname_key = ?`,
          )
          .get(emailKey(identifier), nicknameKey(identifier)) as UserRow | undefined;
        if (
          !user ||
          !user.password_hash ||
          !(await passwordMatches(input.password, user.password_hash))
        )
          throw new ApiError(401, '邮箱、原登录昵称或密码不正确。');
        if (user.account_status === 'disabled')
          throw new ApiError(403, '账号已停用，请联系学校老师。');
        createSession(database, res, user.id);
        return json(res, 200, {
          user: publicUser(user),
          draft: savedDraft(user.id),
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
        sameOrigin(req);
        deleteSession(database, req, res);
        return json(res, 200, { ok: true });
      }
      if (req.method === 'PUT' && url.pathname === '/api/auth/preferences') {
        sameOrigin(req);
        limit(`preferences:${clientIp(req)}`, 120);
        const user = requireUser(database, req);
        const preferences = parsedBody(
          accountPreferencesSchema,
          await readBody(req),
        );
        if (preferences.publicProfile) {
          const draft = savedDraft(user.id);
          if (!draft || !canPublishProfile(draft))
            throw new ApiError(
              400,
              '公开 Profile 需要昵称、毕业年份和至少一个回答。',
            );
        }
        database
          .prepare(
            `UPDATE users SET notify_major_events = ?,
              notify_community_updates = ?, public_profile = ?,
              preferences_updated_at = ? WHERE id = ?`,
          )
          .run(
            Number(preferences.notifyMajorEvents),
            Number(preferences.notifyCommunityUpdates),
            Number(preferences.publicProfile),
            Date.now(),
            user.id,
          );
        const updated = currentUser(database, req);
        return json(res, 200, {
          user: updated ? publicUser(updated) : publicUser(user),
          draft: savedDraft(user.id),
        });
      }
      if (
        req.method === 'POST' &&
        url.pathname === '/api/auth/recover-nickname'
      ) {
        sameOrigin(req);
        limit(`recover:${clientIp(req)}`, 30);
        const input = parsedBody(emailCodeRequestSchema, await readBody(req));
        if (!verificationCodeMatches(input.code))
          throw new ApiError(400, '验证码不正确。');
        const user = database
          .prepare('SELECT nickname FROM users WHERE email_key = ?')
          .get(emailKey(input.email)) as { nickname: string } | undefined;
        if (!user) throw new ApiError(404, '没有找到这个邮箱对应的账号。');
        return json(res, 200, { nickname: user.nickname });
      }
      if (
        req.method === 'POST' &&
        url.pathname === '/api/auth/reset-password'
      ) {
        sameOrigin(req);
        limit(`reset:${clientIp(req)}`, 30);
        const input = parsedBody(
          resetPasswordRequestSchema,
          await readBody(req),
        );
        if (!verificationCodeMatches(input.code))
          throw new ApiError(400, '验证码不正确。');
        const user = database
          .prepare('SELECT id FROM users WHERE email_key = ?')
          .get(emailKey(input.email)) as { id: number } | undefined;
        if (!user) throw new ApiError(404, '没有找到这个邮箱对应的账号。');
        const passwordHash = await hashPassword(input.password);
        database.transaction(() => {
          database
            .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            .run(passwordHash, user.id);
          database.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
        })();
        return json(res, 200, { ok: true });
      }
      if (req.method === 'GET' && url.pathname === '/api/profiles') {
        const rows = database
          .prepare(
            `SELECT profiles.user_id, profiles.draft_json
            FROM profiles
            JOIN users ON users.id = profiles.user_id
            WHERE users.account_status = 'active'
              AND users.public_profile = 1
            ORDER BY profiles.updated_at DESC`,
          )
          .all() as ProfileRow[];
        const profiles = rows.flatMap((row) => {
          try {
            const draft = profileDraftSchema.parse(JSON.parse(row.draft_json));
            if (!canPublishProfile(draft)) return [];
            return [{ id: `member-${row.user_id}`, draft }];
          } catch {
            return [];
          }
        });
        return json(res, 200, { profiles });
      }
      if (req.method === 'PUT' && url.pathname === '/api/profile/me') {
        sameOrigin(req);
        limit(`save-profile:${clientIp(req)}`, 120);
        const user = requireUser(database, req);
        const draft = parsedBody(profileDraftSchema, await readBody(req));
        if (user.public_profile && !canPublishProfile(draft))
          throw new ApiError(
            400,
            '公开 Profile 需要昵称、毕业年份和至少一个回答。',
          );
        const now = Date.now();
        database
          .prepare(
            `INSERT INTO profiles (user_id, draft_json, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              draft_json = excluded.draft_json,
              updated_at = excluded.updated_at`,
          )
          .run(user.id, JSON.stringify(draft), now, now);
        return json(res, 200, {
          profile: { id: `member-${user.id}`, draft },
          published: Boolean(user.public_profile),
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/avatar/emojis') {
        const withEmoji = url.searchParams.get('with');
        if (!withEmoji) return json(res, 200, { emojis: supported });
        const emojis = compatibleEmojis(withEmoji);
        if (!emojis.length)
          throw new ApiError(400, '这个 emoji 暂时无法组合。');
        return json(res, 200, { emojis });
      }
      if (req.method === 'GET' && url.pathname === '/api/avatar/random') {
        const pair = randomPair();
        if (!pair) throw new ApiError(503, '暂时找不到可用组合，请稍后重试。');
        return json(res, 200, pair);
      }
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
      if (req.method === 'POST' && url.pathname === '/api/nicknames/suggestions') {
        sameOrigin(req);
        const parsed = nicknameSuggestionRequestSchema.safeParse(await readBody(req));
        if (!parsed.success)
          throw new ApiError(400, '填写内容格式不正确或过长。');
        const input = parsed.data;
        const ip = clientIp(req);
        const key = createHash('sha256')
          .update(ip + JSON.stringify({ ...input, answers: { ...input.answers, nickname: '' } }))
          .digest('hex');
        for (const [id, item] of nicknameCache)
          if (item.expires < Date.now()) nicknameCache.delete(id);
        if (!nicknameCache.has(key)) {
          limit(`nicknames:${ip}`, 30);
          const today = new Date().toISOString().slice(0, 10);
          if (dailyNicknames.date !== today)
            dailyNicknames = { date: today, count: 0 };
          if (dailyNicknames.count >= Number(process.env.NICKNAME_DAILY_LIMIT || 300))
            throw new ApiError(429, '今天的昵称推荐额度已用完，你可以自己填写。');
          if (activeNicknames >= 3)
            throw new ApiError(503, '昵称推荐正在忙，请稍后重试。');
          dailyNicknames.count++;
          activeNicknames++;
          const promise = (providers.suggestNicknames ?? suggestNicknames)(input)
            .finally(() => { activeNicknames--; });
          if (nicknameCache.size >= 300)
            nicknameCache.delete(nicknameCache.keys().next().value!);
          nicknameCache.set(key, { promise, expires: Date.now() + 10 * 60000 });
          void promise.catch(() => nicknameCache.delete(key));
        }
        return json(res, 200, await nicknameCache.get(key)!.promise);
      }
      if (req.method !== 'POST' || url.pathname !== '/api/avatar/suggestions')
        throw new ApiError(404, '接口不存在。');
      sameOrigin(req);
      const parsed = suggestionRequestSchema.safeParse(await readBody(req));
      if (!parsed.success)
        throw new ApiError(400, '填写内容格式不正确或过长。');
      const input = parsed.data;
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
