import { describe, test, expect } from 'bun:test';
import { renderBioPage, isBioConfigured, sortBlocks, safeUrl, escapeHtml } from './render';
import { socialIconFor } from './icons';
import type { BioProfile, BioBlock } from '@url-redirect/db';

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

let blockId = 0;
function block(partial: Partial<BioBlock> = {}): BioBlock {
  return {
    id: ++blockId,
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

describe('isBioConfigured', () => {
  test('vacía → false (fallback a redirect)', () => {
    expect(isBioConfigured(profile(), [])).toBe(false);
    expect(isBioConfigured(null, [])).toBe(false);
  });
  test('con nombre → true', () => {
    expect(isBioConfigured(profile({ displayName: 'Edu' }), [])).toBe(true);
  });
  test('con bloque activo → true', () => {
    expect(isBioConfigured(profile(), [block({ url: 'https://x.com/a' })])).toBe(true);
  });
  test('solo bloques inactivos y sin nombre → false', () => {
    expect(isBioConfigured(profile(), [block({ isActive: false })])).toBe(false);
  });
});

describe('safeUrl', () => {
  test('rechaza javascript:', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('JaVaScRiPt:alert(1)')).toBeNull();
  });
  test('rechaza data: y vbscript:', () => {
    expect(safeUrl('data:text/html,<script>1</script>')).toBeNull();
    expect(safeUrl('vbscript:x')).toBeNull();
  });
  test('acepta http/https y mailto', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com/');
    expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });
  test('vacío → null', () => {
    expect(safeUrl('')).toBeNull();
    expect(safeUrl('   ')).toBeNull();
  });
});

describe('sortBlocks', () => {
  test('ordena por position, desempata por id', () => {
    const a = block({ id: 5, position: 2 });
    const b = block({ id: 2, position: 1 });
    const c = block({ id: 9, position: 2 });
    const sorted = sortBlocks([a, b, c]);
    expect(sorted.map(x => x.id)).toEqual([2, 5, 9]);
  });
});

describe('renderBioPage', () => {
  test('escapa HTML en nombre, tagline y títulos', () => {
    const html = renderBioPage(
      profile({ displayName: '<script>alert(1)</script>', tagline: '<b>x</b>' }),
      [block({ type: 'link', title: '<img onerror=alert(1)>', url: 'https://example.com' })]
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img onerror=alert(1)&gt;');
  });

  test('omite bloques inactivos', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [
        block({ type: 'link', title: 'Visible', url: 'https://example.com', isActive: true }),
        block({ type: 'link', title: 'Oculto', url: 'https://example.com/2', isActive: false }),
      ]
    );
    expect(html).toContain('Visible');
    expect(html).not.toContain('Oculto');
  });

  test('respeta el orden por position', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [
        block({ type: 'link', title: 'Segundo', url: 'https://a.com', position: 2 }),
        block({ type: 'link', title: 'Primero', url: 'https://b.com', position: 1 }),
      ]
    );
    expect(html.indexOf('Primero')).toBeLessThan(html.indexOf('Segundo'));
  });

  test('no emite enlace para URL javascript:', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'link', title: 'Malo', url: 'javascript:alert(1)' })]
    );
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('Malo');
  });

  test('social: renderiza botón circular con icono según dominio', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [
        block({ type: 'social', url: 'https://github.com/edu' }),
        block({ type: 'social', url: 'https://instagram.com/edu' }),
      ]
    );
    const socialBtns = html.match(/class="social-btn/g) || [];
    expect(socialBtns.length).toBe(2);
    expect(html).toContain('aria-label="GitHub"');
    expect(html).toContain('aria-label="Instagram"');
  });

  test('video: incluye thumbnail y botón play', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'video', title: 'Mi vídeo', url: 'https://youtube.com/watch?v=abc12345', thumbnailUrl: 'https://i.ytimg.com/vi/abc12345/hqdefault.jpg' })]
    );
    expect(html).toContain('card-video');
    expect(html).toContain('hqdefault.jpg');
    expect(html).toContain('class="play"');
  });

  test('promo: incluye imagen grande y subtítulo', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'promo', title: 'Oferta', subtitle: 'Descuento 50%', url: 'https://shop.com', thumbnailUrl: 'https://shop.com/og.png' })]
    );
    expect(html).toContain('card-promo');
    expect(html).toContain('og.png');
    expect(html).toContain('Descuento 50%');
  });

  test('OG meta tags con seo_title y avatar', () => {
    const html = renderBioPage(
      profile({
        displayName: 'Edu',
        seoTitle: 'Edu — links',
        seoDescription: 'Todos mis enlaces',
        avatarUrl: 'https://i.pravatar.cc/200?img=12',
      }),
      []
    );
    expect(html).toContain('<title>Edu — links</title>');
    expect(html).toContain('property="og:title" content="Edu — links"');
    expect(html).toContain('property="og:description" content="Todos mis enlaces"');
    expect(html).toContain('property="og:image" content="https://i.pravatar.cc/200?img=12"');
  });

  test('accent_color inválido cae al default', () => {
    const html = renderBioPage(profile({ displayName: 'Edu', accentColor: 'red; evil' }), []);
    expect(html).toContain('--accent:#0a84ff');
    expect(html).not.toContain('evil');
  });

  test('imágenes llevan loading lazy y no-referrer', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'video', title: 'v', url: 'https://youtube.com/watch?v=abc12345', thumbnailUrl: 'https://i.ytimg.com/vi/abc12345/hqdefault.jpg' })]
    );
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('referrerpolicy="no-referrer"');
  });

  test('respeta prefers-reduced-motion', () => {
    const html = renderBioPage(profile({ displayName: 'Edu' }), []);
    expect(html).toContain('prefers-reduced-motion');
  });

  test('incluye favicon inline data-URI SVG con el accent', () => {
    const html = renderBioPage(profile({ displayName: 'Edu' }), []);
    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="data:image/svg+xml,');
    expect(html).toContain(encodeURIComponent('#0a84ff'));
  });

  test('favicon usa el accent custom validado', () => {
    const html = renderBioPage(profile({ displayName: 'Edu', accentColor: '#ff2d55' }), []);
    expect(html).toContain(encodeURIComponent('#ff2d55'));
  });

  test('section: emite h2.section-title sin enlace', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'section', title: 'Vídeos' })]
    );
    expect(html).toMatch(/<h2 class="section-title[^>]*>Vídeos<\/h2>/);
    expect(html).not.toContain('<a ');
  });

  test('section: se intercala por position dentro de .blocks', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [
        block({ type: 'link', title: 'LinkUno', url: 'https://a.com', position: 2 }),
        block({ type: 'section', title: 'Sección A', position: 1 }),
      ]
    );
    expect(html.indexOf('Sección A')).toBeLessThan(html.indexOf('LinkUno'));
  });

  test('section inactiva no se renderiza', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'section', title: 'Oculta', isActive: false })]
    );
    expect(html).not.toContain('Oculta');
  });

  test('link mailto: data-copy, email como subtitle automático e icono sobre', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'link', title: 'Contacto', url: 'mailto:a@b.c' })]
    );
    expect(html).toContain('data-copy="a@b.c"');
    expect(html).toContain('href="mailto:a@b.c"');
    expect(html).toContain('<span class="card-sub">a@b.c</span>');
    expect(html).toContain('M24 5.457v13.909'); // path del icono de sobre
  });

  test('link mailto con subtitle propio no se sobrescribe', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'link', title: 'Contacto', url: 'mailto:a@b.c', subtitle: 'Escríbeme' })]
    );
    expect(html).toContain('<span class="card-sub">Escríbeme</span>');
    expect(html).not.toContain('<span class="card-sub">a@b.c</span>');
  });

  test('social mailto lleva data-copy', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'social', url: 'mailto:hola@devknives.link' })]
    );
    expect(html).toContain('data-copy="hola@devknives.link"');
    expect(html).toContain('href="mailto:hola@devknives.link"');
  });

  test('social mailto se renderiza como email-line, no como social-btn', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [
        block({ type: 'social', url: 'https://github.com/edu' }),
        block({ type: 'social', url: 'mailto:edu@example.com', title: 'Escríbeme' }),
      ]
    );
    const socialBtns = html.match(/class="social-btn/g) || [];
    expect(socialBtns.length).toBe(1);
    expect(html).toContain('class="email-line enter"');
    expect(html).toContain('data-copy="edu@example.com"');
    expect(html).toContain('href="mailto:edu@example.com"');
    expect(html).toContain('<span class="email-text">edu@example.com</span>');
    expect(html).toContain('aria-label="Copiar email edu@example.com"');
    expect(html).toContain('<span class="copy-icon"><svg');
    expect(html).not.toContain('Escríbeme');
    expect(html.indexOf('class="socials"')).toBeLessThan(html.indexOf('class="email-line'));
  });

  test('varios socials mailto generan varias email-line', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [
        block({ type: 'social', url: 'mailto:a@example.com' }),
        block({ type: 'social', url: 'mailto:b@example.com' }),
      ]
    );
    const lines = html.match(/class="email-line/g) || [];
    expect(lines.length).toBe(2);
    expect(html).toContain('data-copy="a@example.com"');
    expect(html).toContain('data-copy="b@example.com"');
    expect(html).not.toContain('class="social-btn');
    expect(html).not.toContain('class="socials"');
  });

  test('email-line sin socials no lleva margin negativo (clase --solo)', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'social', url: 'mailto:edu@example.com' })]
    );
    expect(html).toContain('class="email-line email-line--solo enter"');
    expect(html).toContain('.email-line--solo{margin-top:0}');
  });

  test('email-line con socials no lleva la clase --solo', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [
        block({ type: 'social', url: 'https://github.com/edu' }),
        block({ type: 'social', url: 'mailto:edu@example.com' }),
      ]
    );
    expect(html).toContain('class="email-line enter"');
    expect(html).not.toContain('email-line--solo enter');
  });

  test('link mailto dentro de .blocks sigue siendo card con sobre', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [
        block({ type: 'social', url: 'mailto:edu@example.com' }),
        block({ type: 'link', title: 'Contacto', url: 'mailto:edu@example.com' }),
      ]
    );
    expect(html).toContain('class="card card-link enter"');
    expect(html).toContain('Contacto');
    expect(html).toContain('M24 5.457v13.909');
    const lines = html.match(/class="email-line/g) || [];
    expect(lines.length).toBe(1);
  });

  test('el script del toast sigue presente con email-lines', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'social', url: 'mailto:edu@example.com' })]
    );
    expect(html).toContain('id="toast"');
    expect(html).toContain('navigator.clipboard');
    expect(html).toContain("closest('[data-copy]')");
    expect(html).toContain('Email copiado');
  });

  test('escapa emails con caracteres raros en data-copy', () => {
    const html = renderBioPage(
      profile({ displayName: 'Edu' }),
      [block({ type: 'link', title: 'x', url: 'mailto:a"b@c.d' })]
    );
    expect(html).toContain('data-copy="a&quot;b@c.d"');
    expect(html).not.toContain('data-copy="a"b@c.d"');
  });

  test('incluye el script del toast y aria-live', () => {
    const html = renderBioPage(profile({ displayName: 'Edu' }), []);
    expect(html).toContain('id="toast"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('navigator.clipboard');
    expect(html).toContain('Email copiado');
  });
});

describe('socialIconFor', () => {
  test('dominios conocidos', () => {
    expect(socialIconFor('https://x.com/edu')).toContain('<svg');
    expect(socialIconFor('https://twitter.com/edu')).toContain('<svg');
    expect(socialIconFor('https://www.youtube.com/@edu')).toContain('<svg');
    expect(socialIconFor('mailto:edu@x.com')).toContain('<svg');
  });
  test('subdominios', () => {
    expect(socialIconFor('https://www.github.com/edu')).toContain('<svg');
  });
  test('dominio desconocido → genérico', () => {
    expect(socialIconFor('https://miweb.es')).toContain('<svg');
  });
  test('URLs distintas dan iconos distintos', () => {
    expect(socialIconFor('https://github.com/a')).not.toBe(socialIconFor('https://twitch.tv/a'));
  });
});

describe('escapeHtml', () => {
  test('escapa los 5 caracteres', () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  });
});
