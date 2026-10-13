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
  avatarConceptRequestSchema,
  avatarRecipeSchema,
  generatedAvatarIdSchema,
  generatedAvatarPath,
  nicknameSuggestionRequestSchema,
  type NicknameSuggestions,
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
import { suggestNicknames } from './nicknames.ts';
import { suggestAvatarConcepts } from './avatar-concepts.ts';
import { createGeneratedAvatarService } from './generated-avatar.ts';
import { moderateComment } from './moderate-comment.ts';
import { ApiError } from './errors.ts';

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
const commentRequestSchema = z.object({ body: z.string().trim().min(2, '评论至少需要 2 个字符。').max(500, '评论最多 500 个字符。') }).strict();

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
    suggestNicknames?: typeof suggestNicknames;
    database?: AppDatabase;
  } = {},
) {
  const database = providers.database ?? openDatabase();
  const generatedAvatars = createGeneratedAvatarService(database);
  const requests = new Map<string, { count: number; expires: number }>();
  const nicknameCache = new Map<
    string,
    { promise: Promise<NicknameSuggestions>; expires: number }
  >();
  const conceptCache = new Map<string, { promise: ReturnType<typeof suggestAvatarConcepts>; expires: number }>();
  let activeNicknames = 0;
  let dailyNicknames = { date: '', count: 0 };
  let activeConcepts = 0;
  let dailyConcepts = { date: '', count: 0 };

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

  function publishedAvatarSubjects() {
    const rows = database.prepare(`
      SELECT profiles.draft_json FROM profiles
      JOIN users ON users.id = profiles.user_id
      WHERE users.account_status = 'active' AND users.public_profile = 1
      UNION ALL
      SELECT draft_json FROM example_profiles
    `).all() as Array<{ draft_json: string }>;
    const subjects = rows.flatMap((row) => {
      try {
        const parsed = profileDraftSchema.safeParse(JSON.parse(row.draft_json));
        if (!parsed.success || !canPublishProfile(parsed.data)) return [];
        const subject = (parsed.data.avatar?.adoptedRecipe ?? parsed.data.avatar?.recipe)?.subject.trim();
        return subject ? [subject] : [];
      } catch { return []; }
    });
    return [...new Set(subjects)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
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
              '公开 Profile 需要昵称和毕业年份。',
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
      const commentMatch = /^\/api\/profiles\/(member-\d+|example-[a-z0-9-]+)\/comments$/.exec(url.pathname);
      if (commentMatch) {
        const profileId = commentMatch[1];
        const profile = publicProfileDraft(profileId);
        if (!profile) throw new ApiError(404, '找不到这个 Profile。');
        if (req.method === 'GET') {
          const rows = database.prepare(`SELECT profile_comments.id, profile_comments.author_user_id,
            profile_comments.body, profile_comments.created_at, profiles.draft_json,
            users.public_profile, users.account_status
            FROM profile_comments LEFT JOIN profiles ON profiles.user_id = profile_comments.author_user_id
            LEFT JOIN users ON users.id = profile_comments.author_user_id
            WHERE profile_comments.profile_id = ? ORDER BY profile_comments.created_at DESC`).all(profileId) as Array<{ id: number; author_user_id: number; body: string; created_at: number; draft_json: string | null; public_profile: number; account_status: string }>;
          const viewer = currentUser(database, req);
          const profileOwnerId = /^member-(\d+)$/.exec(profileId)?.[1];
          const comments = rows.map((row) => {
            const parsed = profileDraftSchema.safeParse(row.draft_json ? JSON.parse(row.draft_json) : null);
            const publicDraft = parsed.success && row.public_profile === 1 && row.account_status === 'active' && canPublishProfile(parsed.data) ? parsed.data : null;
            return { id: row.id, authorName: parsed.success ? parsed.data.nickname : '校友', ...commentAvatar(publicDraft), body: row.body, createdAt: row.created_at, isMine: viewer?.id === row.author_user_id, canDelete: Boolean(viewer && (viewer.id === row.author_user_id || String(viewer.id) === profileOwnerId)) };
          });
          return json(res, 200, { comments });
        }
        if (req.method === 'POST') {
          sameOrigin(req);
          const user = requireUser(database, req);
          limit(`comment:${user.id}`, 20);
          const input = parsedBody(commentRequestSchema, await readBody(req));
          const history = database.prepare('SELECT author_user_id, body, created_at FROM profile_comments WHERE profile_id = ? ORDER BY created_at, id').all(profileId) as Array<{ author_user_id: number; body: string; created_at: number }>;
          const authors = new Map<number, string>();
          const profileOwnerId = /^member-(\d+)$/.exec(profileId)?.[1];
          const publishedComments = history.map((row) => {
            if (!authors.has(row.author_user_id)) authors.set(row.author_user_id, `校友${authors.size + 1}`);
            const isProfileOwner = profileOwnerId === String(row.author_user_id);
            return {
              author: row.author_user_id === user.id
                ? isProfileOwner ? '当前评论者（Profile 主人）' : '当前评论者'
                : isProfileOwner ? 'Profile 主人' : authors.get(row.author_user_id)!,
              body: row.body,
              createdAt: row.created_at,
            };
          });
          const allowed = await moderateComment({
            comment: input.body,
            profile: {
              nickname: profile.nickname,
              year: profile.year,
              summary: profile.summary,
              status: profile.statusId === 'other' ? profile.statusCustom : profile.statusId,
              place: profile.place,
              direction: profile.direction,
              reflection: profile.reflection,
              advice: profile.advice,
              avatarSubject: (profile.avatar?.adoptedRecipe ?? profile.avatar?.recipe)?.subject ?? '',
              avatarDetail: (profile.avatar?.adoptedRecipe ?? profile.avatar?.recipe)?.detail ?? '',
            },
            publishedComments,
          });
          if (!allowed) throw new ApiError(422, '这条评论暂时无法公开，请修改后重试。');
          const now = Date.now();
          const inserted = database.prepare('INSERT INTO profile_comments (profile_id, author_user_id, body, created_at) VALUES (?, ?, ?, ?)').run(profileId, user.id, input.body, now);
          return json(res, 201, { comment: { id: Number(inserted.lastInsertRowid), authorName: savedDraft(user.id)?.nickname || '校友', ...commentAvatar(publicProfileDraft(`member-${user.id}`)), body: input.body, createdAt: now, isMine: true, canDelete: true } });
        }
      }
      const commentDeleteMatch = /^\/api\/profiles\/(member-\d+|example-[a-z0-9-]+)\/comments\/(\d+)$/.exec(url.pathname);
      if (commentDeleteMatch && req.method === 'DELETE') {
        sameOrigin(req);
        const user = requireUser(database, req);
        const [, profileId, commentId] = commentDeleteMatch;
        const comment = database.prepare('SELECT author_user_id FROM profile_comments WHERE id = ? AND profile_id = ?').get(Number(commentId), profileId) as { author_user_id: number } | undefined;
        if (!comment) throw new ApiError(404, '找不到这条评论。');
        const profileOwnerId = /^member-(\d+)$/.exec(profileId)?.[1];
        if (comment.author_user_id !== user.id && profileOwnerId !== String(user.id))
          throw new ApiError(403, '你不能删除这条评论。');
        database.prepare('DELETE FROM profile_comments WHERE id = ? AND profile_id = ?').run(Number(commentId), profileId);
        return json(res, 200, { ok: true });
      }
      if (req.method === 'GET' && url.pathname === '/api/profiles') {
        const memberRows = database
          .prepare(
            `SELECT profiles.user_id, profiles.draft_json
            FROM profiles
            JOIN users ON users.id = profiles.user_id
            WHERE users.account_status = 'active'
              AND users.public_profile = 1
            ORDER BY profiles.updated_at DESC`,
          )
          .all() as ProfileRow[];
        const memberProfiles = memberRows.flatMap((row) => {
          try {
            const draft = profileDraftSchema.parse(JSON.parse(row.draft_json));
            if (!canPublishProfile(draft)) return [];
            return [{ id: `member-${row.user_id}`, draft }];
          } catch {
            return [];
          }
        });
        const exampleRows = database
          .prepare('SELECT id, draft_json FROM example_profiles ORDER BY created_at, id')
          .all() as Array<{ id: string; draft_json: string }>;
        const exampleProfiles = exampleRows.flatMap((row) => {
          try {
            const draft = profileDraftSchema.parse(JSON.parse(row.draft_json));
            if (!canPublishProfile(draft)) return [];
            return [{ id: `example-${row.id}`, draft, example: true }];
          } catch {
            return [];
          }
        });
        const profiles = [...memberProfiles, ...exampleProfiles];
        if (currentUser(database, req)) return json(res, 200, { profiles });
        const seed = `${clientIp(req)}:${new Date().toISOString().slice(0, 10)}`;
        const preview = profiles
          .map((profile) => ({ profile, rank: createHash('sha256').update(`${seed}:${profile.id}`).digest('hex') }))
          .sort((a, b) => a.rank.localeCompare(b.rank))
          .slice(0, 3)
          .map((item) => item.profile);
        return json(res, 200, { profiles: preview, limited: true });
      }
      if (req.method === 'PUT' && url.pathname === '/api/profile/me') {
        sameOrigin(req);
        limit(`save-profile:${clientIp(req)}`, 120);
        const user = requireUser(database, req);
        const inputDraft = parsedBody(profileDraftSchema, await readBody(req));
        if (inputDraft.avatar?.generatedAssetId)
          generatedAvatars.succeededJob(user.id, inputDraft.avatar.generatedAssetId);
        const draft = inputDraft;
        if (user.public_profile && !canPublishProfile(draft))
          throw new ApiError(
            400,
            '公开 Profile 需要昵称和毕业年份。',
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
      if (req.method === 'POST' && url.pathname === '/api/avatar/concepts') {
        sameOrigin(req);
        const input = parsedBody(avatarConceptRequestSchema, await readBody(req));
        const existingSubjects = input.stage === 'subject' ? publishedAvatarSubjects() : [];
        const ip = clientIp(req);
        const key = createHash('sha256').update(ip + JSON.stringify(input) + JSON.stringify(existingSubjects)).digest('hex');
        for (const [id, item] of conceptCache)
          if (item.expires < Date.now()) conceptCache.delete(id);
        if (!conceptCache.has(key)) {
          limit(`avatar-concepts:${ip}`, 100);
          const today = new Date().toISOString().slice(0, 10);
          if (dailyConcepts.date !== today) dailyConcepts = { date: today, count: 0 };
          if (dailyConcepts.count >= Number(process.env.AVATAR_CONCEPT_DAILY_LIMIT || 300))
            throw new ApiError(429, '今天的头像灵感额度已用完，你可以自己填写。');
          if (activeConcepts >= 3)
            throw new ApiError(503, '头像灵感正在忙，请稍后重试。');
          dailyConcepts.count++;
          activeConcepts++;
          const promise = suggestAvatarConcepts(input, existingSubjects).finally(() => { activeConcepts--; });
          if (conceptCache.size >= 300)
            conceptCache.delete(conceptCache.keys().next().value!);
          conceptCache.set(key, { promise, expires: Date.now() + 10 * 60000 });
          void promise.catch(() => conceptCache.delete(key));
        }
        return json(res, 200, await conceptCache.get(key)!.promise);
      }
      if (req.method === 'POST' && url.pathname === '/api/avatar/generations') {
        sameOrigin(req);
        limit(`avatar-generate:${clientIp(req)}`, 30);
        const user = requireUser(database, req);
        const input = parsedBody(z.object({
          recipe: avatarRecipeSchema,
          tone: profileDraftSchema.shape.tone,
          refresh: z.boolean().default(false),
        }).strict(), await readBody(req));
        if (!input.recipe.subject.trim()) throw new ApiError(400, '请先填写头像主体。');
        return json(res, 202, { job: generatedAvatars.start(user.id, input.recipe, input.tone, input.refresh) });
      }
      const generationMatch = /^\/api\/avatar\/generations\/([0-9a-f-]{36})$/.exec(url.pathname);
      if (generationMatch && generatedAvatarIdSchema.safeParse(generationMatch[1]).success) {
        const user = requireUser(database, req);
        if (req.method === 'GET')
          return json(res, 200, { job: generatedAvatars.status(user.id, generationMatch[1]) });
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/avatar/generated/')) {
        const match = /^\/api\/avatar\/generated\/([0-9a-f-]{36})\.png$/.exec(url.pathname);
        if (!match || !generatedAvatarIdSchema.safeParse(match[1]).success)
          throw new ApiError(404, '头像图片不存在。');
        const job = generatedAvatars.findJob(match[1]);
        if (job) {
          if (job.status !== 'succeeded') throw new ApiError(404, '头像图片不存在。');
          const owner = currentUser(database, req)?.id === job.user_id;
          const adopted = savedDraft(job.user_id)?.avatar?.generatedAssetId === job.id;
          const published = database.prepare("SELECT 1 FROM users WHERE id = ? AND account_status = 'active' AND public_profile = 1").get(job.user_id);
          if (!owner && !(adopted && published)) throw new ApiError(404, '头像图片不存在。');
        } else {
          const example = database.prepare(
            `SELECT example_profiles.draft_json FROM example_avatar_assets
             JOIN example_profiles ON example_profiles.id = example_avatar_assets.example_id
             WHERE example_avatar_assets.id = ?`,
          ).get(match[1]) as { draft_json: string } | undefined;
          if (!example) throw new ApiError(404, '头像图片不存在。');
          let adopted = false;
          try {
            const draft = profileDraftSchema.parse(JSON.parse(example.draft_json));
            adopted = draft.avatar?.generatedAssetId === match[1];
          } catch { /* Invalid example profiles are not served. */ }
          if (!adopted) throw new ApiError(404, '头像图片不存在。');
        }
        const bytes = await generatedAvatars.image(match[1]);
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': bytes.length,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        return res.end(bytes);
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
