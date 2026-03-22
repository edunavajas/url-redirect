CREATE TABLE IF NOT EXISTS `links` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `slug` text NOT NULL UNIQUE,
  `destination` text NOT NULL,
  `title` text,
  `is_active` integer NOT NULL DEFAULT 1,
  `max_clicks` integer,
  `created_at` integer NOT NULL,
  `expires_at` integer
);

CREATE TABLE IF NOT EXISTS `visits` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `link_id` integer NOT NULL REFERENCES `links`(`id`) ON DELETE CASCADE,
  `clicked_at` integer NOT NULL,
  `ip_hash` text,
  `user_agent` text,
  `referer` text,
  `country` text
);

CREATE INDEX IF NOT EXISTS `slug_idx` ON `links` (`slug`);
CREATE INDEX IF NOT EXISTS `visits_link_id_idx` ON `visits` (`link_id`);
CREATE INDEX IF NOT EXISTS `visits_clicked_at_idx` ON `visits` (`clicked_at`);
