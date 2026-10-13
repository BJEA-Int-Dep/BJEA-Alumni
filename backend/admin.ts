import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import writeXlsxFile, { type SheetData } from 'write-excel-file/node';
import type { AccountStatus, AdminStudent } from '../shared/admin.ts';
import {
  accountPreferencesSchema,
  canPublishProfile,
  emailSchema,
  nicknameSchema,
  passwordSchema,
  profileDraftSchema,
  realNameSchema,
} from '../shared/account.ts';
import {
  emailKey,
  hashPassword,
  nicknameKey,
} from './auth.ts';
import type { AppDatabase } from './database.ts';
import { ApiError } from './errors.ts';

const ADMIN_COOKIE = 'bjea_admin_session';
const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

const loginSchema = z
  .object({
    username: z.string().trim().min(1).max(80),
    password: z.string().min(1).max(200),
  })
  .strict();

const updateStudentSchema = z
  .object({
    nickname: nicknameSchema,
    realName: realNameSchema,
    email: emailSchema,
    preferences: accountPreferencesSchema,
    status: z.enum(['active', 'disabled']),
    draft: profileDraftSchema.nullable(),
  })
  .strict();

const changePasswordSchema = z
  .object({ password: passwordSchema })
  .strict();

interface AdminRow {
  id: number;
  nickname: string;
  real_name: string;
  email: string;
  has_password: number;
  notify_major_events: number;
  notify_community_updates: number;
  public_profile: number;
  account_status: AccountStatus;
  created_at: number;
  draft_json: string | null;
  profile_updated_at: number | null;
}

interface AdminHandlerContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  database: AppDatabase;
  json: (res: ServerResponse, status: number, value: unknown) => void;
  readBody: (req: IncomingMessage) => Promise<unknown>;
  sameOrigin: (req: IncomingMessage) => void;
  limit: (key: string, max: number) => void;
  clientIp: (req: IncomingMessage) => string;
}

function adminConfig() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  return username && password && secret ? { username, password, secret } : null;
}

function secureCookie() {
  return (
    process.env.SESSION_COOKIE_SECURE === 'true' ||
    process.env.NODE_ENV === 'production'
  );
}

function cookieValue(req: IncomingMessage) {
  for (const item of (req.headers.cookie || '').split(';')) {
    const [name, ...parts] = item.trim().split('=');
    if (name === ADMIN_COOKIE) return decodeURIComponent(parts.join('='));
  }
  return '';
}

function serializeCookie(value: string, maxAge: number) {
  return [
    `${ADMIN_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
    secureCookie() ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function constantEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function createAdminToken(secret: string) {
  const payload = `${Date.now() + ADMIN_SESSION_SECONDS * 1000}.${randomBytes(16).toString('base64url')}`;
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function hasAdminSession(req: IncomingMessage) {
  const config = adminConfig();
  const token = cookieValue(req);
  if (!config || !token) return false;
  const [expiresText, nonce, signature] = token.split('.');
  if (!expiresText || !nonce || !signature) return false;
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires <= Date.now()) return false;
  const payload = `${expiresText}.${nonce}`;
  const expected = createHmac('sha256', config.secret)
    .update(payload)
    .digest('base64url');
  return constantEqual(signature, expected);
}

function requireAdmin(req: IncomingMessage) {
  if (!hasAdminSession(req)) throw new ApiError(401, '管理员登录已失效，请重新登录。');
}

function parseStudent(row: AdminRow): AdminStudent {
  let draft: AdminStudent['draft'] = null;
  if (row.draft_json) {
    try {
      const parsed = profileDraftSchema.safeParse(JSON.parse(row.draft_json));
      if (parsed.success) draft = parsed.data;
    } catch {
      draft = null;
    }
  }
  return {
    id: row.id,
    nickname: row.nickname,
    realName: row.real_name,
    email: row.email,
    hasPassword: Boolean(row.has_password),
    preferences: {
      notifyMajorEvents: Boolean(row.notify_major_events),
      notifyCommunityUpdates: Boolean(row.notify_community_updates),
      publicProfile: Boolean(row.public_profile),
    },
    status: row.account_status,
    createdAt: row.created_at,
    updatedAt: row.profile_updated_at ?? row.created_at,
    draft,
  };
}

function studentRows(database: AppDatabase) {
  return database
    .prepare(
      `SELECT users.id, users.nickname, users.real_name, users.email,
        LENGTH(users.password_hash) > 0 AS has_password,
        users.notify_major_events, users.notify_community_updates,
        users.public_profile, users.account_status,
        users.created_at, profiles.draft_json,
        profiles.updated_at AS profile_updated_at
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      ORDER BY COALESCE(profiles.updated_at, users.created_at) DESC`,
    )
    .all() as AdminRow[];
}

function studentById(database: AppDatabase, userId: number) {
  const row = database
    .prepare(
      `SELECT users.id, users.nickname, users.real_name, users.email,
        LENGTH(users.password_hash) > 0 AS has_password,
        users.notify_major_events, users.notify_community_updates,
        users.public_profile, users.account_status,
        users.created_at, profiles.draft_json,
        profiles.updated_at AS profile_updated_at
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE users.id = ?`,
    )
    .get(userId) as AdminRow | undefined;
  if (!row) throw new ApiError(404, '没有找到这个学生账号。');
  return parseStudent(row);
}

function requirePublishableProfile(student: {
  draft: AdminStudent['draft'];
  preferences: AdminStudent['preferences'];
}) {
  if (
    student.preferences.publicProfile &&
    (!student.draft || !canPublishProfile(student.draft))
  )
    throw new ApiError(
      400,
      '公开 Profile 需要昵称、毕业年份和至少一个回答。',
    );
}

function readUserId(pathname: string, suffix = '') {
  const pattern = new RegExp(`^/api/admin/students/(\\d+)${suffix}$`);
  const match = pattern.exec(pathname);
  return match ? Number(match[1]) : null;
}

async function exportWorkbook(database: AppDatabase) {
  const students = studentRows(database).map(parseStudent);
  const columns = [
    ['账号 ID', 10],
    ['真实姓名（仅后台）', 22],
    ['邮箱', 30],
    ['重大活动通知（约每年）', 20],
    ['校友动态通知（约每季度）', 22],
    ['公开到校友墙', 16],
    ['已设置密码', 14],
    ['旧版登录昵称', 20],
    ['账号状态', 12],
    ['注册时间', 22],
    ['资料更新时间', 22],
    ['Profile 昵称', 18],
    ['毕业年份', 12],
    ['当前阶段', 18],
    ['自定义阶段', 20],
    ['所在地', 24],
    ['方向', 24],
    ['角色简介', 36],
    ['真心话', 48],
    ['给学弟学妹的话', 48],
    ['性格描述', 32],
    ['卡片色调', 14],
    ['头像主体', 24],
    ['配件或动作', 32],
    ['头像图片 ID', 38],
  ] as const;
  const header = columns.map(([label]) => ({
    value: label,
    fontWeight: 'bold' as const,
    backgroundColor: '#F1EEE6',
  }));
  const date = (value: number) => new Date(value).toLocaleString('zh-CN');
  const rows = students.map((student) => {
    const draft = student.draft;
    return [
      student.id,
      student.realName,
      student.email,
      student.preferences.notifyMajorEvents ? '同意' : '未同意',
      student.preferences.notifyCommunityUpdates ? '同意' : '未同意',
      student.preferences.publicProfile ? '是' : '否',
      student.hasPassword ? '是' : '否',
      student.nickname,
      student.status === 'active' ? '正常' : '已停用',
      date(student.createdAt),
      date(student.updatedAt),
      draft?.nickname || '',
      draft?.year || '',
      draft?.statusId || '',
      draft?.statusCustom || '',
      draft?.place || '',
      draft?.direction || '',
      draft?.summary || '',
      draft?.reflection || '',
      draft?.advice || '',
      draft?.personalityCustom || '',
      draft?.tone || '',
      (draft?.avatar?.adoptedRecipe ?? draft?.avatar?.recipe)?.subject || '',
      (draft?.avatar?.adoptedRecipe ?? draft?.avatar?.recipe)?.detail || '',
      draft?.avatar?.generatedAssetId || '',
    ].map((value) => ({ value }));
  });
  const data: SheetData = [header, ...rows];
  return writeXlsxFile(data, {
    columns: columns.map(([, width]) => ({ width })),
    stickyRowsCount: 1,
  }).toBuffer();
}

export async function handleAdminRequest(context: AdminHandlerContext) {
  const {
    req,
    res,
    url,
    database,
    json,
    readBody,
    sameOrigin,
    limit,
    clientIp,
  } = context;
  if (!url.pathname.startsWith('/api/admin/')) return false;

  if (req.method === 'GET' && url.pathname === '/api/admin/me') {
    json(res, 200, {
      configured: Boolean(adminConfig()),
      authenticated: hasAdminSession(req),
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    sameOrigin(req);
    limit(`admin-login:${clientIp(req)}`, 20);
    const config = adminConfig();
    if (!config) throw new ApiError(503, '后台账号尚未配置。');
    const parsed = loginSchema.safeParse(await readBody(req));
    if (
      !parsed.success ||
      !constantEqual(parsed.data.username, config.username) ||
      !constantEqual(parsed.data.password, config.password)
    )
      throw new ApiError(401, '管理员账号或密码不正确。');
    res.setHeader(
      'Set-Cookie',
      serializeCookie(createAdminToken(config.secret), ADMIN_SESSION_SECONDS),
    );
    json(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    sameOrigin(req);
    res.setHeader('Set-Cookie', serializeCookie('', 0));
    json(res, 200, { ok: true });
    return true;
  }

  requireAdmin(req);

  if (req.method === 'GET' && url.pathname === '/api/admin/students') {
    const students = studentRows(database).map(parseStudent);
    json(res, 200, { students });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/export.xlsx') {
    const file = await exportWorkbook(database);
    const filename = `bjea-alumni-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.writeHead(200, {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': file.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(file);
    return true;
  }

  const passwordUserId = readUserId(url.pathname, '/password');
  if (req.method === 'POST' && passwordUserId !== null) {
    sameOrigin(req);
    studentById(database, passwordUserId);
    const parsed = changePasswordSchema.safeParse(await readBody(req));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0]?.message || '新密码不符合要求。');
    const passwordHash = await hashPassword(parsed.data.password);
    database.transaction(() => {
      database
        .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .run(passwordHash, passwordUserId);
      database
        .prepare('DELETE FROM sessions WHERE user_id = ?')
        .run(passwordUserId);
    })();
    json(res, 200, { ok: true });
    return true;
  }

  const userId = readUserId(url.pathname);
  if (req.method === 'PUT' && userId !== null) {
    sameOrigin(req);
    studentById(database, userId);
    const parsed = updateStudentSchema.safeParse(await readBody(req));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0]?.message || '填写内容不正确。');
    const input = parsed.data;
    requirePublishableProfile(input);
    const now = Date.now();
    try {
      database.transaction(() => {
        database
          .prepare(
            `UPDATE users SET nickname = ?, nickname_key = ?, email = ?,
              email_key = ?, real_name = ?, notify_major_events = ?,
              notify_community_updates = ?, public_profile = ?,
              preferences_updated_at = ?, account_status = ? WHERE id = ?`,
          )
          .run(
            input.nickname.trim(),
            nicknameKey(input.nickname),
            input.email,
            emailKey(input.email),
            input.realName,
            Number(input.preferences.notifyMajorEvents),
            Number(input.preferences.notifyCommunityUpdates),
            Number(input.preferences.publicProfile),
            now,
            input.status,
            userId,
          );
        if (input.draft)
          database
            .prepare(
              `INSERT INTO profiles (user_id, draft_json, created_at, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
                draft_json = excluded.draft_json,
                updated_at = excluded.updated_at`,
            )
            .run(userId, JSON.stringify(input.draft), now, now);
        if (input.status === 'disabled')
          database.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      })();
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed/.test(error.message))
        throw new ApiError(409, '登录昵称或邮箱已经被其他账号使用。');
      throw error;
    }
    json(res, 200, { student: studentById(database, userId) });
    return true;
  }

  if (req.method === 'DELETE' && userId !== null) {
    sameOrigin(req);
    const student = studentById(database, userId);
    database.prepare('DELETE FROM users WHERE id = ?').run(userId);
    json(res, 200, { ok: true, deletedNickname: student.nickname });
    return true;
  }

  throw new ApiError(404, '后台接口不存在。');
}
