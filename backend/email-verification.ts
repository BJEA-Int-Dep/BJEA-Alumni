import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { emailSchema } from '../shared/account.ts';
import { emailKey } from './auth.ts';
import type { AppDatabase } from './database.ts';
import { ApiError } from './errors.ts';

export type EmailCodePurpose = 'login' | 'register' | 'recover-nickname' | 'reset-password';

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_EMAIL = 5;
const MAX_ATTEMPTS = 5;

function deliveryConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = emailSchema.safeParse(process.env.RESEND_FROM_EMAIL).data;
  if (apiKey && from) return { apiKey, from };
  throw new ApiError(503, '邮箱验证码服务尚未配置，请稍后重试。');
}

function codeHash(secret: string, email: string, purpose: EmailCodePurpose, code: string) {
  return createHmac('sha256', secret)
    .update(JSON.stringify([email, purpose, code]))
    .digest('hex');
}

function eligibleForCode(db: AppDatabase, email: string, purpose: EmailCodePurpose) {
  const user = db.prepare('SELECT account_status FROM users WHERE email_key = ?')
    .get(email) as { account_status: 'active' | 'disabled' } | undefined;
  return purpose === 'register' ? !user : user?.account_status === 'active';
}

export async function sendEmailCode(
  db: AppDatabase,
  email: string,
  purpose: EmailCodePurpose,
): Promise<{ ok: true; status: 'accepted' }> {
  const config = deliveryConfig();
  const normalizedEmail = emailKey(email);
  // Return the same response for ineligible addresses to avoid exposing account existence.
  if (!eligibleForCode(db, normalizedEmail, purpose))
    return { ok: true, status: 'accepted' };

  const now = Date.now();
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const hash = codeHash(config.apiKey, normalizedEmail, purpose, code);

  const previous = db.transaction(() => {
    db.prepare('DELETE FROM email_verification_codes WHERE expires_at <= ?').run(now);
    db.prepare('DELETE FROM email_code_limits WHERE window_started_at <= ?')
      .run(now - SEND_WINDOW_MS);
    const counter = db.prepare(
      'SELECT window_started_at, send_count, last_sent_at FROM email_code_limits WHERE email_key = ?',
    ).get(normalizedEmail) as {
      window_started_at: number; send_count: number; last_sent_at: number;
    } | undefined;
    if (counter && now - counter.last_sent_at < RESEND_COOLDOWN_MS)
      throw new ApiError(429, '请稍等一分钟再获取验证码。');
    if (counter && counter.send_count >= MAX_SENDS_PER_EMAIL)
      throw new ApiError(429, '这个邮箱获取验证码太频繁，请稍后再试。');
    const previousCode = db.prepare(
      'SELECT code_hash, expires_at, attempts FROM email_verification_codes WHERE email_key = ? AND purpose = ?',
    ).get(normalizedEmail, purpose) as {
      code_hash: string; expires_at: number; attempts: number;
    } | undefined;
    db.prepare(`INSERT INTO email_code_limits
      (email_key, window_started_at, send_count, last_sent_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(email_key) DO UPDATE SET
        send_count = email_code_limits.send_count + 1,
        last_sent_at = excluded.last_sent_at`).run(normalizedEmail, now, now);
    db.prepare(`INSERT INTO email_verification_codes
      (email_key, purpose, code_hash, expires_at, attempts)
      VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(email_key, purpose) DO UPDATE SET
        code_hash = excluded.code_hash,
        expires_at = excluded.expires_at,
        attempts = 0`).run(normalizedEmail, purpose, hash, now + CODE_LIFETIME_MS);
    return { previousCode, previousCounter: counter };
  })();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `亦中校友宇宙 <${config.from}>`,
        to: [email],
        subject: '亦中校友宇宙邮箱验证码',
        text: `你的验证码是 ${code}，10 分钟内有效。若不是你本人操作，请忽略这封邮件。`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn(`[email] Resend rejected a message (${response.status}).`);
      throw new Error('Resend rejected the message');
    }
  } catch {
    db.transaction(() => {
      const currentCode = db.prepare(
        'SELECT code_hash FROM email_verification_codes WHERE email_key = ? AND purpose = ?',
      ).get(normalizedEmail, purpose) as { code_hash: string } | undefined;
      if (currentCode?.code_hash === hash) {
        if (previous.previousCode)
          db.prepare(`UPDATE email_verification_codes
            SET code_hash = ?, expires_at = ?, attempts = ?
            WHERE email_key = ? AND purpose = ?`)
            .run(previous.previousCode.code_hash, previous.previousCode.expires_at,
              previous.previousCode.attempts, normalizedEmail, purpose);
        else
          db.prepare('DELETE FROM email_verification_codes WHERE email_key = ? AND purpose = ?')
            .run(normalizedEmail, purpose);
      }
      const currentCounter = db.prepare(
        'SELECT last_sent_at FROM email_code_limits WHERE email_key = ?',
      ).get(normalizedEmail) as { last_sent_at: number } | undefined;
      if (currentCounter?.last_sent_at === now) {
        if (previous.previousCounter)
          db.prepare(`UPDATE email_code_limits
            SET window_started_at = ?, send_count = ?, last_sent_at = ?
            WHERE email_key = ?`)
            .run(previous.previousCounter.window_started_at,
              previous.previousCounter.send_count, previous.previousCounter.last_sent_at,
              normalizedEmail);
        else
          db.prepare('DELETE FROM email_code_limits WHERE email_key = ?')
            .run(normalizedEmail);
      }
    })();
    throw new ApiError(502, '验证码邮件发送失败，请稍后重试。');
  }
  return { ok: true, status: 'accepted' };
}

export function consumeEmailCode(
  db: AppDatabase,
  email: string,
  purpose: EmailCodePurpose,
  code: string,
) {
  const config = deliveryConfig();
  const normalizedEmail = emailKey(email);
  return db.transaction(() => {
    const row = db.prepare(
      'SELECT code_hash, expires_at, attempts FROM email_verification_codes WHERE email_key = ? AND purpose = ?',
    ).get(normalizedEmail, purpose) as {
      code_hash: string; expires_at: number; attempts: number;
    } | undefined;
    if (!row) return false;
    if (row.expires_at <= Date.now() || row.attempts >= MAX_ATTEMPTS) {
      db.prepare('DELETE FROM email_verification_codes WHERE email_key = ? AND purpose = ?')
        .run(normalizedEmail, purpose);
      return false;
    }
    const actual = Buffer.from(codeHash(config.apiKey, normalizedEmail, purpose, code), 'hex');
    const expected = Buffer.from(row.code_hash, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      if (row.attempts + 1 >= MAX_ATTEMPTS)
        db.prepare('DELETE FROM email_verification_codes WHERE email_key = ? AND purpose = ?')
          .run(normalizedEmail, purpose);
      else
        db.prepare('UPDATE email_verification_codes SET attempts = attempts + 1 WHERE email_key = ? AND purpose = ?')
          .run(normalizedEmail, purpose);
      return false;
    }
    db.prepare('DELETE FROM email_verification_codes WHERE email_key = ? AND purpose = ?')
      .run(normalizedEmail, purpose);
    return true;
  })();
}
