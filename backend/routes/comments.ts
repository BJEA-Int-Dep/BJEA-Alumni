import { z } from 'zod';
import { canPublishProfile, profileDraftSchema } from '../../shared/account.ts';
import { currentUser, requireUser } from '../auth.ts';
import { moderateComment } from '../moderate-comment.ts';
import { ApiError } from '../errors.ts';
import type { ApiContext } from './context.ts';

const commentRequestSchema = z.object({ body: z.string().trim().min(2, '评论至少需要 2 个字符。').max(500, '评论最多 500 个字符。') }).strict();

export async function handleCommentsRequest(context: ApiContext): Promise<boolean> {
  const { req, res, url, database, json, readBody, sameOrigin, parsedBody, limit, savedDraft, publicProfileDraft, commentAvatar } = context;
  const respond = (status: number, value: unknown) => {
    json(res, status, value);
    return true;
  };
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
      return respond(200, { comments });
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
      return respond(201, { comment: { id: Number(inserted.lastInsertRowid), authorName: savedDraft(user.id)?.nickname || '校友', ...commentAvatar(publicProfileDraft(`member-${user.id}`)), body: input.body, createdAt: now, isMine: true, canDelete: true } });
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
    return respond(200, { ok: true });
  }
  return false;
}
