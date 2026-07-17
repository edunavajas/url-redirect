import type { BioProfile, BioBlock } from '@url-redirect/db';
import { renderBioPage, isBioConfigured } from './render';

export interface BioCacheEntry {
  configured: boolean;
  html: string | null;
  cachedAt: number;
}

export type BioAction =
  | { kind: 'serve'; html: string }
  | { kind: 'redirect' }
  | { kind: 'refresh' };

export function decideBioAction(entry: BioCacheEntry | null, now: number, ttlMs: number): BioAction {
  if (entry && now - entry.cachedAt < ttlMs) {
    if (entry.configured && entry.html !== null) return { kind: 'serve', html: entry.html };
    return { kind: 'redirect' };
  }
  return { kind: 'refresh' };
}

export function buildBioCacheEntry(profile: BioProfile | null, blocks: BioBlock[], now: number): BioCacheEntry {
  const configured = isBioConfigured(profile, blocks);
  return {
    configured,
    html: configured ? renderBioPage(profile, blocks) : null,
    cachedAt: now,
  };
}

export function decideStaleFallback(entry: BioCacheEntry | null): Exclude<BioAction, { kind: 'refresh' }> {
  if (entry?.configured && entry.html !== null) return { kind: 'serve', html: entry.html };
  return { kind: 'redirect' };
}
