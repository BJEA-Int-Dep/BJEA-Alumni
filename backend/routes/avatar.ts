import { createHash } from 'node:crypto';
import { z } from 'zod';
import { canPublishProfile, profileDraftSchema, profileToneSchema } from '../../shared/account.ts';
import { avatarConceptRequestSchema, avatarRecipeSchema, generatedAvatarIdSchema } from '../../shared/avatar.ts';
import { currentUser, requireUser } from '../auth.ts';
import { suggestAvatarConcepts } from '../avatar-concepts.ts';
import { ApiError } from '../errors.ts';
import type { AppDatabase } from '../database.ts';
import type { ApiContext } from './context.ts';

function publishedAvatarSubjects(database: AppDatabase) {
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

export function createAvatarRoutes() {
  const conceptCache = new Map<string, { promise: ReturnType<typeof suggestAvatarConcepts>; expires: number }>();
  let activeConcepts = 0;
  let dailyConcepts = { date: '', count: 0 };

  return async function handleAvatarRequest(context: ApiContext): Promise<boolean> {
    const { req, res, url, database, generatedAvatars, json, readBody, sameOrigin, parsedBody, clientIp, limit, savedDraft } = context;
    const respond = (status: number, value: unknown) => {
      json(res, status, value);
      return true;
    };
    if (req.method === 'POST' && url.pathname === '/api/avatar/concepts') {
      sameOrigin(req);
      const input = parsedBody(avatarConceptRequestSchema, await readBody(req));
      const existingSubjects = input.stage === 'subject' ? publishedAvatarSubjects(database) : [];
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
      return respond(200, await conceptCache.get(key)!.promise);
    }
    if (req.method === 'POST' && url.pathname === '/api/avatar/generations') {
      sameOrigin(req);
      limit(`avatar-generate:${clientIp(req)}`, 30);
      const user = requireUser(database, req);
      const input = parsedBody(z.object({
        recipe: avatarRecipeSchema,
        tone: profileToneSchema,
        refresh: z.boolean().default(false),
      }).strict(), await readBody(req));
      if (!input.recipe.subject.trim()) throw new ApiError(400, '请先填写头像主体。');
      return respond(202, { job: generatedAvatars.start(user.id, input.recipe, input.tone, input.refresh) });
    }
    const generationMatch = /^\/api\/avatar\/generations\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (generationMatch && generatedAvatarIdSchema.safeParse(generationMatch[1]).success) {
      const user = requireUser(database, req);
      if (req.method === 'GET')
        return respond(200, { job: generatedAvatars.status(user.id, generationMatch[1]) });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/avatar/generated/')) {
      const match = /^\/api\/avatar\/generated\/([0-9a-f-]{36})(\.png|\.thumb\.webp)$/.exec(url.pathname);
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
      const thumbnail = match[2] === '.thumb.webp';
      const bytes = await generatedAvatars.image(match[1], thumbnail);
      const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`;
      const cacheHeaders = {
        'Cache-Control': 'private, no-cache',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
      };
      // Revalidate only after checking access and confirming the image still exists.
      const notModified = req.headers['if-none-match']?.split(',').some((value) => {
        const tag = value.trim();
        return tag === '*' || tag.replace(/^W\//, '') === etag;
      });
      if (notModified) {
        res.writeHead(304, cacheHeaders);
        res.end();
        return true;
      }
      res.writeHead(200, {
        ...cacheHeaders,
        'Content-Type': thumbnail ? 'image/webp' : 'image/png',
        'Content-Length': bytes.length,
      });
      res.end(bytes);
      return true;
    }
    return false;
  };
}
