export const BLOCK_TYPES = ['social', 'link', 'video', 'promo'] as const;
export type BlockType = typeof BLOCK_TYPES[number];

export function isValidHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export function isValidHttpUrlOrEmpty(v: string): boolean {
  const t = (v || '').trim();
  if (!t) return true;
  if (/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(t)) return true;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface BlockInput {
  type: BlockType;
  title: string;
  url: string;
  thumbnailUrl: string;
  subtitle: string;
}

export function validateBlockInput(body: Record<string, unknown>): { ok: true; data: BlockInput } | { ok: false; error: string } {
  const type = String(body['type'] ?? '') as BlockType;
  if (!BLOCK_TYPES.includes(type)) {
    return { ok: false, error: 'Tipo de bloque no válido' };
  }
  const title = String(body['title'] ?? '').trim();
  const url = String(body['url'] ?? '').trim();
  const thumbnailUrl = String(body['thumbnail_url'] ?? '').trim();
  const subtitle = String(body['subtitle'] ?? '').trim();

  if (!url) return { ok: false, error: 'La URL es obligatoria' };
  if (!isValidHttpUrlOrEmpty(url)) return { ok: false, error: 'URL no válida (solo http/https)' };
  if (thumbnailUrl && !isValidHttpUrlOrEmpty(thumbnailUrl)) return { ok: false, error: 'URL de imagen no válida' };
  if (type !== 'social' && !title) return { ok: false, error: 'El título es obligatorio para este tipo' };

  return { ok: true, data: { type, title, url, thumbnailUrl, subtitle } };
}

export function parseReorderIds(body: unknown): number[] | null {
  if (!Array.isArray(body)) return null;
  const ids = body.map(v => Number(v));
  if (ids.some(n => !Number.isInteger(n) || n <= 0)) return null;
  if (new Set(ids).size !== ids.length) return null;
  return ids;
}
