import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL || '/data/links.db';

const sqlite = new Database(DATABASE_URL, { create: true });

// Optimizaciones SQLite para velocidad máxima
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA synchronous = NORMAL;');
sqlite.exec('PRAGMA cache_size = -64000;');  // 64MB cache
sqlite.exec('PRAGMA foreign_keys = ON;');
sqlite.exec('PRAGMA temp_store = MEMORY;');

export const db = drizzle(sqlite, { schema });

// Migración embebida — no depende de rutas de filesystem
export function runMigrations() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      destination TEXT NOT NULL,
      title TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      max_clicks INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      clicked_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      ip_hash TEXT,
      user_agent TEXT,
      referer TEXT,
      country TEXT
    );

    CREATE INDEX IF NOT EXISTS slug_idx ON links(slug);
    CREATE INDEX IF NOT EXISTS visits_link_id_idx ON visits(link_id);
    CREATE INDEX IF NOT EXISTS visits_clicked_at_idx ON visits(clicked_at);
  `);
}

export { schema };
export default db;
