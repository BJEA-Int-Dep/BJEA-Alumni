import { createHash } from 'node:crypto';
import { canPublishProfile, profileDraftSchema } from '../../shared/account.ts';
import { currentUser, requireUser } from '../auth.ts';
import { ApiError } from '../errors.ts';
import type { ApiContext } from './context.ts';

interface ProfileRow {
  user_id: number;
  draft_json: string;
}

export async function handleProfilesRequest(context: ApiContext): Promise<boolean> {
  const { req, res, url, database, json, readBody, sameOrigin, parsedBody, clientIp, limit, generatedAvatars } = context;
  const respond = (status: number, value: unknown) => {
    json(res, status, value);
    return true;
  };
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
    if (currentUser(database, req)) return respond(200, { profiles });
    const seed = `${clientIp(req)}:${new Date().toISOString().slice(0, 10)}`;
    const preview = profiles
      .map((profile) => ({ profile, rank: createHash('sha256').update(`${seed}:${profile.id}`).digest('hex') }))
      .sort((a, b) => a.rank.localeCompare(b.rank))
      .slice(0, 3)
      .map((item) => item.profile);
    return respond(200, { profiles: preview, limited: true });
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
    return respond(200, {
      profile: { id: `member-${user.id}`, draft },
      published: Boolean(user.public_profile),
    });
  }
  return false;
}
