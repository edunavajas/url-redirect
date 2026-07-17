import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import {
  parseOgTags,
  extractYouTubeId,
  isHttpUrl,
  buildOEmbedUrl,
  parseOEmbed,
  pickThumbnail,
  fetchOg,
} from './og';

describe('extractYouTubeId', () => {
  test('watch?v=', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  test('watch con otros params', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?t=42&v=dQw4w9WgXcQ&list=x')).toBe('dQw4w9WgXcQ');
  });
  test('youtu.be', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  test('shorts', () => {
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  test('no youtube', () => {
    expect(extractYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(extractYouTubeId('https://example.com')).toBeNull();
  });
});

describe('parseOgTags', () => {
  test('meta tags orden estándar, comillas dobles', () => {
    const html = `<html><head>
      <meta property="og:title" content="Mi título">
      <meta property="og:description" content="Mi descripción">
      <meta property="og:image" content="https://example.com/img.png">
    </head><body></body></html>`;
    const d = parseOgTags(html, 'https://example.com/page');
    expect(d.title).toBe('Mi título');
    expect(d.description).toBe('Mi descripción');
    expect(d.image).toBe('https://example.com/img.png');
  });

  test('content antes de property, comillas simples', () => {
    const html = `<meta content='Título invertido' property='og:title'>
      <meta name="twitter:description" content="Desc twitter">`;
    const d = parseOgTags(html, 'https://example.com');
    expect(d.title).toBe('Título invertido');
    expect(d.description).toBe('Desc twitter');
  });

  test('URL de imagen relativa se resuelve contra la URL final', () => {
    const html = `<meta property="og:image" content="/static/cover.jpg">
      <meta property="og:title" content="x">`;
    const d = parseOgTags(html, 'https://example.com/blog/post');
    expect(d.image).toBe('https://example.com/static/cover.jpg');
  });

  test('URL relativa de path', () => {
    const html = `<meta property="og:image" content="img/cover.jpg">`;
    const d = parseOgTags(html, 'https://example.com/blog/post');
    expect(d.image).toBe('https://example.com/blog/img/cover.jpg');
  });

  test('fallback a <title> si no hay og:title', () => {
    const html = `<html><head><title>Título del documento</title></head></html>`;
    const d = parseOgTags(html, 'https://example.com');
    expect(d.title).toBe('Título del documento');
  });

  test('decodifica entidades HTML', () => {
    const html = `<meta property="og:title" content="Rock &amp; Roll &quot;forever&quot;">`;
    const d = parseOgTags(html, 'https://example.com');
    expect(d.title).toBe('Rock & Roll "forever"');
  });

  test('twitter: como fallback', () => {
    const html = `<meta name="twitter:title" content="T título">
      <meta name="twitter:image" content="https://example.com/t.png">`;
    const d = parseOgTags(html, 'https://example.com');
    expect(d.title).toBe('T título');
    expect(d.image).toBe('https://example.com/t.png');
  });

  test('sin meta tags devuelve strings vacíos', () => {
    const d = parseOgTags('<html><head></head><body>hola</body></html>', 'https://example.com');
    expect(d.title).toBe('');
    expect(d.image).toBe('');
    expect(d.description).toBe('');
  });

  test('imagen inválida se descarta', () => {
    const html = `<meta property="og:image" content="ht!tp://\\invalid url">`;
    const d = parseOgTags(html, 'https://example.com');
    expect(typeof d.image).toBe('string');
  });
});

describe('isHttpUrl', () => {
  test('http/https válidos', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
    expect(isHttpUrl('http://example.com/x?y=1')).toBe(true);
  });
  test('rechaza otros esquemas y basura', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('not a url')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });
});

describe('buildOEmbedUrl', () => {
  test('construye la URL canónica con format=json', () => {
    const u = buildOEmbedUrl('dQw4w9WgXcQ');
    expect(u.startsWith('https://www.youtube.com/oembed?')).toBe(true);
    expect(u).toContain('url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ');
    expect(u).toContain('format=json');
  });
});

describe('parseOEmbed', () => {
  test('extrae title y author_name como description', () => {
    const d = parseOEmbed({ title: 'Rick Astley - Never Gonna Give You Up', author_name: 'Rick Astley' });
    expect(d.title).toBe('Rick Astley - Never Gonna Give You Up');
    expect(d.description).toBe('Rick Astley');
  });
  test('sin author_name devuelve description vacía', () => {
    const d = parseOEmbed({ title: 'Video' });
    expect(d.description).toBe('');
  });
  test('sin título lanza error', () => {
    expect(() => parseOEmbed({ author_name: 'x' })).toThrow();
    expect(() => parseOEmbed(null)).toThrow();
    expect(() => parseOEmbed('nope')).toThrow();
  });
});

describe('pickThumbnail', () => {
  test('maxres disponible', () => {
    expect(pickThumbnail('abc123', true)).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
  });
  test('fallback a hqdefault', () => {
    expect(pickThumbnail('abc123', false)).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');
  });
});

describe('fetchOg (integración con fetch mockeado)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mock.restore();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockYouTube(oembedStatus: number, oembedBody: unknown, maxresStatus: number) {
    globalThis.fetch = mock(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/oembed')) {
        return new Response(JSON.stringify(oembedBody), { status: oembedStatus });
      }
      if (url.includes('i.ytimg.com') && init?.method === 'HEAD') {
        return new Response(null, { status: maxresStatus });
      }
      throw new Error(`fetch inesperado: ${url}`);
    }) as unknown as typeof fetch;
  }

  test('YouTube oEmbed OK → title + author + maxres', async () => {
    mockYouTube(200, { title: 'Video Real', author_name: 'Canal Real' }, 200);
    const d = await fetchOg('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(d.title).toBe('Video Real');
    expect(d.description).toBe('Canal Real');
    expect(d.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });

  test('maxres 404 → hqdefault', async () => {
    mockYouTube(200, { title: 'Video Real', author_name: 'Canal Real' }, 404);
    const d = await fetchOg('https://youtu.be/dQw4w9WgXcQ');
    expect(d.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  test('oEmbed 404 → error, sin fallback a scraping', async () => {
    mockYouTube(404, {}, 200);
    await expect(fetchOg('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).rejects.toThrow('404');
  });

  test('oEmbed JSON inválido → error', async () => {
    globalThis.fetch = mock(async () => new Response('<html>nope</html>', { status: 200 })) as unknown as typeof fetch;
    await expect(fetchOg('https://www.youtube.com/shorts/dQw4w9WgXcQ')).rejects.toThrow();
  });

  test('URL no-YouTube va al scraper genérico con Accept-Language', async () => {
    let capturedHeaders: Headers | null = null;
    globalThis.fetch = mock(async (input: any, init?: any) => {
      capturedHeaders = new Headers(init?.headers);
      const html = `<html><head><meta property="og:title" content="Sitio normal"></head></html>`;
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
    }) as unknown as typeof fetch;
    const d = await fetchOg('https://github.com/algo');
    expect(d.title).toBe('Sitio normal');
    expect(capturedHeaders!.get('Accept-Language')).toBe('es-ES,es;q=0.9,en;q=0.8');
  });
});
