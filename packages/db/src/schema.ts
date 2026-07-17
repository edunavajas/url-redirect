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

export const bioProfile = pgTable('bio_profile', {
  id: integer('id').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  tagline: text('tagline').notNull().default(''),
  avatarUrl: text('avatar_url').notNull().default(''),
  accentColor: text('accent_color').notNull().default('#0a84ff'),
  seoTitle: text('seo_title').notNull().default(''),
  seoDescription: text('seo_description').notNull().default(''),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
});

export const bioBlocks = pgTable('bio_blocks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  type: text('type', { enum: ['social', 'link', 'video', 'promo', 'section'] }).notNull(),
  title: text('title').notNull().default(''),
  url: text('url').notNull().default(''),
  thumbnailUrl: text('thumbnail_url').notNull().default(''),
  subtitle: text('subtitle').notNull().default(''),
  position: integer('position').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
});

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type LinkHistory = typeof linkHistory.$inferSelect;
export type NewLinkHistory = typeof linkHistory.$inferInsert;
export type BioProfile = typeof bioProfile.$inferSelect;
export type NewBioProfile = typeof bioProfile.$inferInsert;
export type BioBlock = typeof bioBlocks.$inferSelect;
export type NewBioBlock = typeof bioBlocks.$inferInsert;
export type BioBlockType = 'social' | 'link' | 'video' | 'promo' | 'section';
