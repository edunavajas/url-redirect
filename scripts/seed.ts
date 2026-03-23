#!/usr/bin/env bun
import 'dotenv/config';
import { db, schema } from '../packages/db/src/index';
import { runMigrations } from '../packages/db/src/client';

await runMigrations();

await db.insert(schema.links).values({
  slug: 'test',
  destination: 'https://example.com',
  title: 'Link de prueba',
});

console.log('✅ Link de prueba creado: /test → https://example.com');
process.exit(0);
