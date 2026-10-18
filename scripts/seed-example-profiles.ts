import { readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { profileDraftSchema, type PersistedProfileDraft } from '../shared/account.ts';
import { avatarRecipeSchema, emptyAvatar, generatedAvatarIdSchema, type AvatarRecipe } from '../shared/avatar.ts';
import { openDatabase } from '../backend/database.ts';

try {
  loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const examples = JSON.parse(
  readFileSync(new URL('./example-profiles.json', import.meta.url), 'utf8'),
) as Array<Pick<PersistedProfileDraft, 'nickname' | 'year' | 'summary' | 'tone' | 'experiences' | 'reflection' | 'advice'> & {
  id: string;
  personalityTraits: string[];
  avatarRecipe: AvatarRecipe;
}>;

const rows = examples.map((example, index) => {
  if (!/^[a-z0-9-]{1,40}$/.test(example.id))
    throw new Error(`Invalid example id: ${example.id}`);
  const draft = profileDraftSchema.parse({
    nickname: example.nickname,
    personalityTraits: example.personalityTraits,
    personalityCustom: '',
    tone: example.tone,
    summary: example.summary,
    avatar: { ...emptyAvatar(), recipe: example.avatarRecipe },
    year: example.year,
    experiences: example.experiences,
    reflection: example.reflection,
    advice: example.advice,
  });
  return { id: example.id, draft, order: index };
});

const database = openDatabase();
try {
  const upsert = database.prepare(
    `INSERT INTO example_profiles (id, draft_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET draft_json = excluded.draft_json,
       updated_at = excluded.updated_at`,
  );
  const existingRow = database.prepare('SELECT draft_json FROM example_profiles WHERE id = ?');
  const now = Date.now();
  database.transaction(() => {
    for (const row of rows) {
      const existing = existingRow.get(row.id) as { draft_json: string } | undefined;
      let generatedAssetId: string | undefined;
      let adoptedRecipe: AvatarRecipe | undefined;
      if (existing) {
        try {
          const avatar = JSON.parse(existing.draft_json)?.avatar;
          const id = generatedAvatarIdSchema.safeParse(avatar?.generatedAssetId);
          const recipe = avatarRecipeSchema.safeParse(avatar?.adoptedRecipe ?? avatar?.recipe);
          if (id.success) generatedAssetId = id.data;
          if (recipe.success) adoptedRecipe = recipe.data;
        } catch { /* Replace invalid saved draft. */ }
      }
      const draft = {
        ...row.draft,
        avatar: {
          ...row.draft.avatar!,
          generatedAssetId,
          adoptedRecipe: generatedAssetId ? adoptedRecipe : undefined,
        },
      };
      upsert.run(row.id, JSON.stringify(draft), now + row.order, now);
    }
  })();
  console.info(`Synchronized ${rows.length} example profiles; existing generated avatars were kept.`);
} finally {
  database.close();
}
