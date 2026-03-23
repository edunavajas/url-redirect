import { pgTable, text, integer, bigserial, bigint, boolean } from 'drizzle-orm/pg-core';

export const links = pgTable('links', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  destination: text('destination').notNull(),
  title: text('title'),
  isActive: boolean('is_active').notNull().default(true),
  maxClicks: integer('max_clicks'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  expiresAt: bigint('expires_at', { mode: 'number' }),
});

export const visits = pgTable('visits', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  linkId: bigint('link_id', { mode: 'number' }).notNull().references(() => links.id, { onDelete: 'cascade' }),
  clickedAt: bigint('clicked_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  country: text('country'),
});

export const linkHistory = pgTable('link_history', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  linkId: bigint('link_id', { mode: 'number' }).notNull().references(() => links.id, { onDelete: 'cascade' }),
  fieldName: text('field_name').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  editedAt: bigint('edited_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
});

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type LinkHistory = typeof linkHistory.$inferSelect;
export type NewLinkHistory = typeof linkHistory.$inferInsert;
