import { describe, test, expect } from 'bun:test';
import { parseOgTags, extractYouTubeId, isHttpUrl } from './og';

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
