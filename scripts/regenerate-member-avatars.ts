import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { openDatabase } from '../backend/database.ts';
import { avatarStyleVersion, generateImage, storeGeneratedImage } from '../backend/generated-avatar.ts';
import { profileDraftSchema } from '../shared/account.ts';

try {
  loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const database = openDatabase();
const imageDirectory = resolve(process.env.GENERATED_AVATAR_DIR || '.data/generated-avatars');
let completed = 0;
let failed = 0;
try {
  const rows = database.prepare('SELECT user_id, draft_json FROM profiles ORDER BY user_id')
    .all() as Array<{ user_id: number; draft_json: string }>;
  for (const row of rows) {
    const draft = profileDraftSchema.parse(JSON.parse(row.draft_json));
    const recipe = draft.avatar?.adoptedRecipe ?? draft.avatar?.recipe;
    if (!recipe?.subject.trim()) {
      failed++;
      console.warn(`Profile ${row.user_id} has no avatar recipe.`);
      continue;
    }
    const recipeJson = JSON.stringify({ recipe, tone: draft.tone, styleVersion: avatarStyleVersion });
    const existingId = draft.avatar?.generatedAssetId;
    const existing = existingId
      ? database.prepare("SELECT recipe_json FROM avatar_jobs WHERE id = ? AND user_id = ? AND status = 'succeeded'")
        .get(existingId, row.user_id) as { recipe_json: string } | undefined
      : undefined;
    if (existing?.recipe_json === recipeJson && existsSync(resolve(imageDirectory, `${existingId}.png`))) {
      console.info(`Skipped profile ${row.user_id}: avatar already generated.`);
      continue;
    }
    try {
      const bytes = await generateImage(recipe, draft.tone);
      const id = randomUUID();
      await storeGeneratedImage(id, bytes);
      const now = Date.now();
      const updated = { ...draft, avatar: { ...draft.avatar!, generatedAssetId: id, adoptedRecipe: recipe } };
      database.transaction(() => {
        database.prepare("INSERT INTO avatar_jobs (id, user_id, recipe_json, status, created_at, updated_at) VALUES (?, ?, ?, 'succeeded', ?, ?)")
          .run(id, row.user_id, recipeJson, now, now);
        database.prepare('UPDATE profiles SET draft_json = ?, updated_at = ? WHERE user_id = ?')
          .run(JSON.stringify(updated), now, row.user_id);
      })();
      completed++;
      console.info(`Generated profile ${row.user_id} (${completed}/${rows.length}).`);
    } catch (error) {
      failed++;
      console.warn(`Failed profile ${row.user_id}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  console.info(`Generated ${completed} member avatars; ${failed} failed.`);
  if (failed) process.exitCode = 1;
} finally {
  database.close();
}
