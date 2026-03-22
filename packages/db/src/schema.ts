import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const links = sqliteTable('links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  destination: text('destination').notNull(),
  title: text('title'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  maxClicks: integer('max_clicks'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
});

export const visits = sqliteTable('visits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  linkId: integer('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  clickedAt: integer('clicked_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  country: text('country'),
});

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
