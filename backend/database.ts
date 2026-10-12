import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type AppDatabase = Database.Database;

export function openDatabase(path = process.env.DATABASE_PATH || '.data/bjea.sqlite') {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      nickname_key TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      email_key TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      real_name TEXT NOT NULL DEFAULT '',
      notify_major_events INTEGER NOT NULL DEFAULT 0
        CHECK(notify_major_events IN (0, 1)),
      notify_community_updates INTEGER NOT NULL DEFAULT 0
        CHECK(notify_community_updates IN (0, 1)),
      public_profile INTEGER NOT NULL DEFAULT 0
        CHECK(public_profile IN (0, 1)),
      preferences_updated_at INTEGER NOT NULL DEFAULT 0,
      account_status TEXT NOT NULL DEFAULT 'active'
        CHECK(account_status IN ('active', 'disabled')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_expires_at
      ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      draft_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS example_profiles (
      id TEXT PRIMARY KEY,
      draft_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  const userColumns = db
    .prepare('PRAGMA table_info(users)')
    .all() as Array<{ name: string }>;
  const addUserColumn = (name: string, definition: string) => {
    if (!userColumns.some((column) => column.name === name))
      db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
  };
  addUserColumn(
    'account_status',
    "TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active', 'disabled'))",
  );
  addUserColumn('real_name', "TEXT NOT NULL DEFAULT ''");
  addUserColumn(
    'notify_major_events',
    'INTEGER NOT NULL DEFAULT 0 CHECK(notify_major_events IN (0, 1))',
  );
  addUserColumn(
    'notify_community_updates',
    'INTEGER NOT NULL DEFAULT 0 CHECK(notify_community_updates IN (0, 1))',
  );
  addUserColumn(
    'public_profile',
    'INTEGER NOT NULL DEFAULT 0 CHECK(public_profile IN (0, 1))',
  );
  addUserColumn('preferences_updated_at', 'INTEGER NOT NULL DEFAULT 0');
  return db;
}
