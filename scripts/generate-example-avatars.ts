import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { profileDraftSchema } from '../shared/account.ts';
import { openDatabase } from '../backend/database.ts';
import { avatarStyleVersion, generateImage, storeGeneratedImage } from '../backend/generated-avatar.ts';

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
  const rows = database.prepare('SELECT id, draft_json FROM example_profiles ORDER BY created_at, id')
    .all() as Array<{ id: string; draft_json: string }>;
  for (const row of rows) {
    const draft = profileDraftSchema.parse(JSON.parse(row.draft_json));
    const recipe = draft.avatar?.recipe;
    if (!recipe?.subject.trim()) throw new Error(`Missing avatar recipe for ${row.id}`);
    const recipeJson = JSON.stringify({ recipe, tone: draft.tone, styleVersion: avatarStyleVersion });
    const existingId = draft.avatar?.generatedAssetId;
    const existing = existingId
      ? database.prepare('SELECT recipe_json FROM example_avatar_assets WHERE id = ? AND example_id = ?')
        .get(existingId, row.id) as { recipe_json: string } | undefined
      : undefined;
    if (existing?.recipe_json === recipeJson && existsSync(resolve(imageDirectory, `${existingId}.png`))) {
      console.info(`Skipped ${row.id}: avatar already generated.`);
      continue;
    }
    try {
      const bytes = await generateImage(recipe, draft.tone);
      const id = randomUUID();
      await storeGeneratedImage(id, bytes);
      const updated = { ...draft, avatar: { ...draft.avatar!, generatedAssetId: id } };
      database.transaction(() => {
        database.prepare('INSERT INTO example_avatar_assets (id, example_id, recipe_json, created_at) VALUES (?, ?, ?, ?)')
          .run(id, row.id, recipeJson, Date.now());
        database.prepare('UPDATE example_profiles SET draft_json = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(updated), Date.now(), row.id);
      })();
      completed++;
      console.info(`Generated ${row.id} (${completed}/${rows.length}).`);
    } catch (error) {
      failed++;
      console.warn(`Failed ${row.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  console.info(`Generated ${completed} avatars; ${failed} failed.`);
  if (failed) process.exitCode = 1;
} finally {
  database.close();
}
