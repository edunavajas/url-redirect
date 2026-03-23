import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('[DB] Using PostgreSQL database');

const pool = new Pool({
  connectionString: DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// Migración embebida — no depende de rutas de filesystem
export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        destination TEXT NOT NULL,
        title TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        max_clicks INTEGER,
        created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
        expires_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        clicked_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
        ip_hash TEXT,
        user_agent TEXT,
        referer TEXT,
        country TEXT
      );

      CREATE INDEX IF NOT EXISTS slug_idx ON links(slug);
      CREATE INDEX IF NOT EXISTS visits_link_id_idx ON visits(link_id);
      CREATE INDEX IF NOT EXISTS visits_clicked_at_idx ON visits(clicked_at);

      CREATE TABLE IF NOT EXISTS link_history (
        id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        edited_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
      );

      CREATE INDEX IF NOT EXISTS link_history_link_id_idx ON link_history(link_id);
      CREATE INDEX IF NOT EXISTS link_history_edited_at_idx ON link_history(edited_at);
    `);
    console.log('[DB] Migrations completed successfully');
  } catch (error) {
    console.error('[DB] Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { schema };
export default db;
