import { describe, test, expect, afterEach } from 'bun:test';
import { decideDeepLink } from './index';

const IG_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 Instagram 297.0.0.33.109 Android';
const IG_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 297.0.0.12.123';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const WHATSAPP = 'WhatsApp/2.23.20.0 A';

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const YT_INTENT =
  'intent://www.youtube.com/watch?v=dQw4w9WgXcQ#Intent;scheme=https;S.browser_fallback_url=' +
  encodeURIComponent(YT) +
  ';end';
const YT_VND = 'vnd.youtube://www.youtube.com/watch?v=dQw4w9WgXcQ';

afterEach(() => {
  delete process.env.DEEP_LINKS_DISABLED;
});

describe('decideDeepLink', () => {
  test('flag off → plain', () => {
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: false, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
  });

  test('destino no registrado → plain', () => {
    expect(decideDeepLink({ destination: 'https://example.com/page', deepLinkEnabled: true, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
  });

  test('destino inválido → plain', () => {
    expect(decideDeepLink({ destination: 'no-es-una-url', deepLinkEnabled: true, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
    expect(decideDeepLink({ destination: '', deepLinkEnabled: true, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
  });

  test('bots y unfurlers → plain (los previews resuelven al destino)', () => {
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: GOOGLEBOT })).toEqual({ kind: 'plain' });
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: WHATSAPP })).toEqual({ kind: 'plain' });
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: null })).toEqual({ kind: 'plain' });
  });

  test('Android in-app (Instagram) → interstitial con intent:// + fallback https', () => {
    const d = decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: IG_ANDROID });
    expect(d.kind).toBe('interstitial');
    if (d.kind === 'interstitial') {
      expect(d.html).toContain('intent://www.youtube.com/watch?v=dQw4w9WgXcQ#Intent;');
      expect(d.html).not.toContain('package=');
      expect(d.html).toContain(YT);
      expect(d.html).toContain('<noscript>');
      expect(d.html).toContain('Abrir en YouTube');
    }
  });

  test('Chrome Android NORMAL (no in-app) → interstitial igual (cambio clave)', () => {
    const d = decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: CHROME_ANDROID });
    expect(d.kind).toBe('interstitial');
    if (d.kind === 'interstitial') {
      expect(d.html).toContain('intent://');
      expect(d.html).toContain(YT);
    }
  });

  test('iPhone Safari normal → interstitial con vnd.youtube:// + fallback https', () => {
    for (const ua of [SAFARI_IOS, IG_IOS]) {
      const d = decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: ua });
      expect(d.kind).toBe('interstitial');
      if (d.kind === 'interstitial') {
        expect(d.html).toContain(YT_VND);
        expect(d.html).toContain(YT);
        expect(d.html).toContain('http-equiv="refresh"');
      }
    }
  });

  test('desktop Chrome → plain (301 clásico)', () => {
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: CHROME_DESKTOP })).toEqual({ kind: 'plain' });
  });

  test('DEEP_LINKS_DISABLED=true → plain aunque todo lo demás aplique', () => {
    process.env.DEEP_LINKS_DISABLED = 'true';
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
  });

  test('DEEP_LINKS_DISABLED con otro valor no desactiva', () => {
    process.env.DEEP_LINKS_DISABLED = 'false';
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: IG_ANDROID }).kind).toBe('interstitial');
  });
});
