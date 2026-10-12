import { readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { profileDraftSchema } from '../shared/account.ts';
import { openDatabase } from '../backend/database.ts';
import type { AlumniProfile } from '../frontend/lib/alumni-data.ts';

try {
  loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const examples = JSON.parse(
  readFileSync(new URL('./example-profiles.json', import.meta.url), 'utf8'),
) as AlumniProfile[];

const rows = examples.map((example, index) => {
  if (!/^[a-z0-9-]{1,40}$/.test(example.id))
    throw new Error(`Invalid example id: ${example.id}`);
  const draft = profileDraftSchema.parse({
    nickname: example.nickname,
    personalityId: '',
    personalityTraits: [],
    personalityCustom: '',
    emoji: example.emoji,
    tone: example.tone,
    summary: example.summary,
    year: example.year,
    statusId: 'other',
    statusCustom: example.status,
    place: example.place,
    direction: example.direction,
    reflection: example.reflection,
    advice: example.advice,
  });
  return { id: example.id, draft: JSON.stringify(draft), order: index };
});

const database = openDatabase();
try {
  const insert = database.prepare(
    `INSERT OR IGNORE INTO example_profiles (id, draft_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
  );
  const now = Date.now();
  const inserted = database.transaction(() =>
    rows.reduce(
      (count, row) =>
        count + insert.run(row.id, row.draft, now + row.order, now).changes,
      0,
    ),
  )();
  console.info(`Added ${inserted} example profiles; existing entries were kept.`);
} finally {
  database.close();
}
