import { describe, test, expect, afterEach } from 'bun:test';
import { decideDeepLink } from './index';

const IG_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 Instagram 297.0.0.33.109 Android';
const IG_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 297.0.0.12.123';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

afterEach(() => {
  delete process.env.DEEP_LINKS_DISABLED;
});

describe('decideDeepLink', () => {
  test('flag off → plain', () => {
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: false, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
  });

  test('UA no in-app → plain', () => {
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: SAFARI_IOS })).toEqual({ kind: 'plain' });
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: null })).toEqual({ kind: 'plain' });
  });

  test('destino no registrado → plain', () => {
    expect(decideDeepLink({ destination: 'https://example.com/page', deepLinkEnabled: true, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
  });

  test('destino inválido → plain', () => {
    expect(decideDeepLink({ destination: 'no-es-una-url', deepLinkEnabled: true, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
    expect(decideDeepLink({ destination: '', deepLinkEnabled: true, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
  });

  test('in-app + android → intent', () => {
    const d = decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: IG_ANDROID });
    expect(d.kind).toBe('intent');
    if (d.kind === 'intent') {
      expect(d.location).toContain('intent://www.youtube.com/watch?v=dQw4w9WgXcQ#Intent;');
      expect(d.location).toContain('package=com.google.android.youtube');
      expect(d.location).toContain('S.browser_fallback_url=' + encodeURIComponent(YT));
    }
  });

  test('in-app + ios → interstitial con scheme, fallback https y noscript', () => {
    const d = decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: IG_IOS });
    expect(d.kind).toBe('interstitial');
    if (d.kind === 'interstitial') {
      expect(d.html).toContain('youtube://watch?v=dQw4w9WgXcQ');
      expect(d.html).toContain(YT);
      expect(d.html).toContain('<noscript>');
      expect(d.html).toContain('http-equiv="refresh"');
      expect(d.html).toContain('Abrir en YouTube');
    }
  });

  test('DEEP_LINKS_DISABLED=true → plain aunque todo lo demás aplique', () => {
    process.env.DEEP_LINKS_DISABLED = 'true';
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: IG_ANDROID })).toEqual({ kind: 'plain' });
  });

  test('DEEP_LINKS_DISABLED con otro valor no desactiva', () => {
    process.env.DEEP_LINKS_DISABLED = 'false';
    const d = decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: IG_ANDROID });
    expect(d.kind).toBe('intent');
  });

  test('in-app con os other → plain (conservador)', () => {
    // UA con marcador in-app pero sin android/iphone/ipad
    const weird = 'Instagram 297.0.0.33.109 (Unknown OS)';
    expect(decideDeepLink({ destination: YT, deepLinkEnabled: true, userAgent: weird })).toEqual({ kind: 'plain' });
  });
});
