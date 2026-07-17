export interface OgData {
  title: string;
  description: string;
  image: string;
}

const MAX_BYTES = 100 * 1024;
const FETCH_TIMEOUT_MS = 5000;

export function extractYouTubeId(url: string): string | null {
  let m = url.match(/(?:youtube\.com\/watch\?[^#]*v=)([\w-]{6,20})/);
  if (m) return m[1];
  m = url.match(/youtu\.be\/([\w-]{6,20})/);
  if (m) return m[1];
  m = url.match(/youtube\.com\/shorts\/([\w-]{6,20})/);
  if (m) return m[1];
  m = url.match(/youtube\.com\/embed\/([\w-]{6,20})/);
  if (m) return m[1];
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .trim();
}

// Soporta comillas simples/dobles y orden de atributos variable
const META_TAG_RE = /<meta\b[^>]*>/gi;
const ATTR_RE = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

export function parseOgTags(html: string, finalUrl: string): OgData {
  const head = html.slice(0, 60 * 1024);
  const map = new Map<string, string>();

  for (const tagMatch of head.matchAll(META_TAG_RE)) {
    const tag = tagMatch[0];
    let property = '';
    let content = '';
    for (const attrMatch of tag.matchAll(ATTR_RE)) {
      const name = attrMatch[1].toLowerCase();
      const value = attrMatch[3] ?? attrMatch[4] ?? '';
      if (name === 'property' || name === 'name') property = value.toLowerCase();
      if (name === 'content') content = value;
    }
    if (property && content && !map.has(property)) {
      map.set(property, decodeEntities(content));
    }
  }

  let title =
    map.get('og:title') || map.get('twitter:title') || '';
  if (!title) {
    const t = head.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (t) title = decodeEntities(t[1]);
  }
  const description =
    map.get('og:description') || map.get('twitter:description') || map.get('description') || '';

  let image = map.get('og:image') || map.get('og:image:url') || map.get('og:image:secure_url') || map.get('twitter:image') || map.get('twitter:image:src') || '';
  if (image) {
    try {
      image = new URL(image, finalUrl).toString();
    } catch {
      image = '';
    }
  }

  return { title, description, image };
}

export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildOEmbedUrl(videoId: string): string {
  const canonical = `https://www.youtube.com/watch?v=${videoId}`;
  return `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;
}

export function parseOEmbed(json: unknown): { title: string; description: string } {
  if (!json || typeof json !== 'object') {
    throw new Error('Respuesta oEmbed inválida');
  }
  const o = json as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title : '';
  const author = typeof o.author_name === 'string' ? o.author_name : '';
  if (!title) {
    throw new Error('Respuesta oEmbed sin título');
  }
  return { title, description: author };
}

export function pickThumbnail(videoId: string, maxresOk: boolean): string {
  const file = maxresOk ? 'maxresdefault.jpg' : 'hqdefault.jpg';
  return `https://i.ytimg.com/vi/${videoId}/${file}`;
}

const HEAD_TIMEOUT_MS = 3000;

async function headOk(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchYouTubeOg(videoId: string): Promise<OgData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let parsed: { title: string; description: string };
  try {
    const res = await fetch(buildOEmbedUrl(videoId), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`YouTube oEmbed respondió ${res.status}`);
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new Error('Respuesta oEmbed inválida');
    }
    parsed = parseOEmbed(json);
  } finally {
    clearTimeout(timer);
  }
  const maxresOk = await headOk(pickThumbnail(videoId, true));
  return { ...parsed, image: pickThumbnail(videoId, maxresOk) };
}

export async function fetchOg(url: string): Promise<OgData> {
  if (!isHttpUrl(url)) {
    throw new Error('URL no válida: solo http/https');
  }

  const ytId = extractYouTubeId(url);
  if (ytId) {
    return fetchYouTubeOg(ytId);
  }

  return scrape(url);
}

async function scrape(url: string): Promise<OgData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'WhatsApp/2.26',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) {
      throw new Error(`El sitio respondió ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('La URL no devuelve HTML');
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Sin cuerpo de respuesta');
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
      }
    }
    try { await reader.cancel(); } catch { /* noop */ }

    const html = new TextDecoder().decode(concat(chunks));
    const finalUrl = res.url || url;
    const data = parseOgTags(html, finalUrl);
    if (!data.title && !data.image && !data.description) {
      throw new Error('No se encontraron meta tags Open Graph');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
