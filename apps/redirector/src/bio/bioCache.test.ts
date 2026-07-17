import { describe, test, expect } from 'bun:test';
import { decideBioAction, buildBioCacheEntry, decideStaleFallback, type BioCacheEntry } from './bioCache';
import type { BioProfile, BioBlock } from '@url-redirect/db';

const TTL = 30_000;
const NOW = 1_000_000;

function profile(partial: Partial<BioProfile> = {}): BioProfile {
  return {
    id: 1,
    displayName: '',
    tagline: '',
    avatarUrl: '',
    accentColor: '#0a84ff',
    seoTitle: '',
    seoDescription: '',
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

function block(partial: Partial<BioBlock> = {}): BioBlock {
  return {
    id: 1,
    type: 'link',
    title: '',
    url: '',
    thumbnailUrl: '',
    subtitle: '',
    position: 0,
    isActive: true,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

function entry(partial: Partial<BioCacheEntry> = {}): BioCacheEntry {
  return { configured: true, html: '<html>bio</html>', cachedAt: NOW, ...partial };
}

describe('decideBioAction', () => {
  test('sin cache → refresh', () => {
    expect(decideBioAction(null, NOW, TTL)).toEqual({ kind: 'refresh' });
  });

  test('cache válido y configurada → serve sin queries', () => {
    expect(decideBioAction(entry(), NOW + TTL - 1, TTL)).toEqual({ kind: 'serve', html: '<html>bio</html>' });
  });

  test('cache válido y NO configurada → redirect sin queries', () => {
    expect(decideBioAction(entry({ configured: false, html: null }), NOW + TTL - 1, TTL)).toEqual({ kind: 'redirect' });
  });

  test('cache justo en el TTL → refresh', () => {
    expect(decideBioAction(entry(), NOW + TTL, TTL)).toEqual({ kind: 'refresh' });
  });

  test('cache expirado → refresh', () => {
    expect(decideBioAction(entry(), NOW + TTL + 1, TTL)).toEqual({ kind: 'refresh' });
  });

  test('configurada pero html null (inconsistente) → redirect', () => {
    expect(decideBioAction(entry({ html: null }), NOW, TTL)).toEqual({ kind: 'redirect' });
  });
});

describe('buildBioCacheEntry', () => {
  test('configurada → configured true y html renderizado', () => {
    const e = buildBioCacheEntry(profile({ displayName: 'Edu' }), [], NOW);
    expect(e.configured).toBe(true);
    expect(e.html).toContain('<!DOCTYPE html>');
    expect(e.html).toContain('Edu');
    expect(e.cachedAt).toBe(NOW);
  });

  test('no configurada → configured false y html null (no renderiza)', () => {
    const e = buildBioCacheEntry(profile(), [block({ isActive: false })], NOW);
    expect(e.configured).toBe(false);
    expect(e.html).toBeNull();
  });

  test('profile null y bloque activo → configurada', () => {
    const e = buildBioCacheEntry(null, [block({ url: 'https://x.com/a' })], NOW);
    expect(e.configured).toBe(true);
    expect(e.html).not.toBeNull();
  });
});

describe('decideStaleFallback (BD caída)', () => {
  test('hay cache viejo configurada → serve', () => {
    expect(decideStaleFallback(entry({ cachedAt: 0 }))).toEqual({ kind: 'serve', html: '<html>bio</html>' });
  });

  test('cache viejo NO configurada → redirect', () => {
    expect(decideStaleFallback(entry({ configured: false, html: null }))).toEqual({ kind: 'redirect' });
  });

  test('sin cache → redirect', () => {
    expect(decideStaleFallback(null)).toEqual({ kind: 'redirect' });
  });
});
