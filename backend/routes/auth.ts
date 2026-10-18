import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import {
  accountPreferencesSchema, canPublishProfile, emailSchema, nicknameSchema,
  passwordSchema, realNameSchema, verificationCodeSchema,
} from '../../shared/account.ts';
import {
  createSession, currentUser, deleteSession, emailKey, hashPassword,
  nicknameKey, passwordMatches, publicUser, requireUser,
} from '../auth.ts';
import { consumeEmailCode, sendEmailCode } from '../email-verification.ts';
import { ApiError } from '../errors.ts';
import type { ApiContext } from './context.ts';

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

export async function handleAuthRequest(context: ApiContext): Promise<boolean> {
  const { req, res, url, database, json, readBody, sameOrigin, parsedBody, clientIp, limit, savedDraft } = context;
  const respond = (status: number, value: unknown) => {
    json(res, status, value);
    return true;
  };
  if (
    req.method === 'GET' &&
    url.pathname === '/api/auth/nickname-availability'
  ) {
    limit(`availability:${clientIp(req)}`, 300);
    const result = nicknameSchema.safeParse(
      url.searchParams.get('nickname') || '',
    );
    if (!result.success)
      return respond(200, {
        valid: false,
        available: false,
        error: result.error.issues[0]?.message,
      });
    const occupied = database
      .prepare('SELECT 1 FROM users WHERE nickname_key = ?')
      .get(nicknameKey(result.data));
    return respond(200, {
      valid: true,
      available: !occupied,
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    const user = currentUser(database, req);
    return respond(200,
      user
        ? { user: publicUser(user), draft: savedDraft(user.id) }
        : { user: null, draft: null },
    );
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/send-code') {
    sameOrigin(req);
    limit(`send-code:${clientIp(req)}`, 30);
    const input = parsedBody(sendCodeRequestSchema, await readBody(req));
    return respond(200, await sendEmailCode(database, input.email, input.purpose));
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    sameOrigin(req);
    limit(`register:${clientIp(req)}`, 20);
    const input = parsedBody(registerRequestSchema, await readBody(req));
    if (!consumeEmailCode(database, input.email, 'register', input.code))
      throw new ApiError(400, '验证码不正确或已失效。');
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
    return respond(201, { user: publicUser(user), draft: null });
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/email-login') {
    sameOrigin(req);
    limit(`email-login:${clientIp(req)}`, 60);
    const input = parsedBody(emailCodeRequestSchema, await readBody(req));
    if (!consumeEmailCode(database, input.email, 'login', input.code))
      throw new ApiError(400, '验证码不正确或已失效。');
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
    return respond(200, {
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
    return respond(200, {
      user: publicUser(user),
      draft: savedDraft(user.id),
    });
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    sameOrigin(req);
    deleteSession(database, req, res);
    return respond(200, { ok: true });
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
    return respond(200, {
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
    if (!consumeEmailCode(database, input.email, 'recover-nickname', input.code))
      throw new ApiError(400, '验证码不正确或已失效。');
    const user = database
      .prepare('SELECT nickname FROM users WHERE email_key = ?')
      .get(emailKey(input.email)) as { nickname: string } | undefined;
    if (!user) throw new ApiError(404, '没有找到这个邮箱对应的账号。');
    return respond(200, { nickname: user.nickname });
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
    if (!consumeEmailCode(database, input.email, 'reset-password', input.code))
      throw new ApiError(400, '验证码不正确或已失效。');
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
    return respond(200, { ok: true });
  }
  return false;
}
