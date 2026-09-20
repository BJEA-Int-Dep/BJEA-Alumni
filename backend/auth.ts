import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { promisify } from 'node:util';
import type { AccountUser } from '../shared/account.ts';
import type { AppDatabase } from './database.ts';
import { ApiError } from './errors.ts';

const SESSION_COOKIE = 'bjea_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const scryptAsync = promisify(scrypt);

interface UserRow {
  id: number;
  nickname: string;
  email: string;
  password_hash: string;
  has_profile?: number;
}

export function nicknameKey(value: string) {
  return value.trim().normalize('NFKC').toLocaleLowerCase('en-US');
}

export function emailKey(value: string) {
  return value.trim().normalize('NFKC').toLocaleLowerCase('en-US');
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString('base64url')}:${derived.toString('base64url')}`;
}

export async function passwordMatches(password: string, encoded: string) {
  const [algorithm, saltText, expectedText] = encoded.split(':');
  if (algorithm !== 'scrypt' || !saltText || !expectedText) return false;
  const salt = Buffer.from(saltText, 'base64url');
  const expected = Buffer.from(expectedText, 'base64url');
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function cookieValue(req: IncomingMessage) {
  const header = req.headers.cookie || '';
  for (const item of header.split(';')) {
    const [name, ...parts] = item.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(parts.join('='));
  }
  return '';
}

function secureCookie() {
  return (
    process.env.SESSION_COOKIE_SECURE === 'true' ||
    process.env.NODE_ENV === 'production'
  );
}

function serializeCookie(value: string, maxAge: number) {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    secureCookie() ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function createSession(
  db: AppDatabase,
  res: ServerResponse,
  userId: number,
) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(
    tokenHash(token),
    userId,
    now,
    now + SESSION_MAX_AGE_SECONDS * 1000,
  );
  res.setHeader('Set-Cookie', serializeCookie(token, SESSION_MAX_AGE_SECONDS));
}

export function deleteSession(
  db: AppDatabase,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const token = cookieValue(req);
  if (token)
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  res.setHeader('Set-Cookie', serializeCookie('', 0));
}

export function currentUser(db: AppDatabase, req: IncomingMessage) {
  const token = cookieValue(req);
  if (!token) return null;
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  return (
    (db
      .prepare(
        `SELECT users.id, users.nickname, users.email,
          EXISTS(SELECT 1 FROM profiles WHERE profiles.user_id = users.id) AS has_profile
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
      )
      .get(tokenHash(token), now) as UserRow | undefined) || null
  );
}

export function requireUser(db: AppDatabase, req: IncomingMessage) {
  const user = currentUser(db, req);
  if (!user) throw new ApiError(401, '请先登录。');
  return user;
}

export function publicUser(row: UserRow): AccountUser {
  return {
    id: row.id,
    nickname: row.nickname,
    email: row.email,
    hasProfile: Boolean(row.has_profile),
  };
}

export function verificationCodeMatches(code: string) {
  return code === (process.env.AUTH_TEST_CODE || '7410');
}
