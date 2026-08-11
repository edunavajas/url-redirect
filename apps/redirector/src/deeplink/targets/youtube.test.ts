import { describe, test, expect } from 'bun:test';
import { match, canonicalWeb, iosScheme, androidIntent, type YouTubeParsed } from './youtube';

function u(s: string): URL {
  return new URL(s);
}

describe('youtube.match', () => {
  test('youtube.com/watch?v=', () => {
    expect(match(u('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))).toEqual({ kind: 'video', id: 'dQw4w9WgXcQ' });
  });

  test('youtu.be/<id>', () => {
    expect(match(u('https://youtu.be/dQw4w9WgXcQ'))).toEqual({ kind: 'video', id: 'dQw4w9WgXcQ' });
    expect(match(u('https://youtu.be/dQw4w9WgXcQ?t=42'))).toEqual({ kind: 'video', id: 'dQw4w9WgXcQ' });
  });

  test('shorts y live', () => {
    expect(match(u('https://www.youtube.com/shorts/abc123_-XYZ'))).toEqual({ kind: 'shorts', id: 'abc123_-XYZ' });
    expect(match(u('https://youtube.com/live/abc123_-XYZ'))).toEqual({ kind: 'live', id: 'abc123_-XYZ' });
  });

  test('channel y handle', () => {
    expect(match(u('https://www.youtube.com/channel/UCuAXFkgsw1Lo7aL5BPEyZJQ'))).toEqual({
      kind: 'channel',
      id: 'UCuAXFkgsw1Lo7aL5BPEyZJQ',
    });
    expect(match(u('https://www.youtube.com/@MrBeast'))).toEqual({ kind: 'handle', id: 'MrBeast' });
  });

  test('playlist', () => {
    expect(match(u('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'))).toEqual({
      kind: 'playlist',
      id: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
    });
  });

  test('variantes m. y host en mayúsculas', () => {
    expect(match(u('https://m.youtube.com/watch?v=dQw4w9WgXcQ'))).toEqual({ kind: 'video', id: 'dQw4w9WgXcQ' });
    expect(match(u('https://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ'))).toEqual({ kind: 'video', id: 'dQw4w9WgXcQ' });
  });

  test('watch con params extra (t=, list=)', () => {
    expect(match(u('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PL123'))).toEqual({
      kind: 'video',
      id: 'dQw4w9WgXcQ',
    });
  });

  test('no-YouTube o basura → null', () => {
    expect(match(u('https://vimeo.com/123456'))).toBeNull();
    expect(match(u('https://notyoutube.com/watch?v=dQw4w9WgXcQ'))).toBeNull();
    expect(match(u('https://www.youtube.com/'))).toBeNull();
    expect(match(u('https://youtu.be/'))).toBeNull();
    expect(match(u('https://www.youtube.com/watch'))).toBeNull();
    expect(match(u('https://www.youtube.com/watch?v='))).toBeNull();
    expect(match(u('https://www.youtube.com/watch?v=bad id!!'))).toBeNull();
  });
});

describe('youtube builders', () => {
  const video: YouTubeParsed = { kind: 'video', id: 'dQw4w9WgXcQ' };
  const shorts: YouTubeParsed = { kind: 'shorts', id: 'abc123' };
  const channel: YouTubeParsed = { kind: 'channel', id: 'UC123' };
  const handle: YouTubeParsed = { kind: 'handle', id: 'MrBeast' };
  const playlist: YouTubeParsed = { kind: 'playlist', id: 'PL123' };

  test('canonicalWeb', () => {
    expect(canonicalWeb(video)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(canonicalWeb(shorts)).toBe('https://www.youtube.com/shorts/abc123');
    expect(canonicalWeb({ kind: 'live', id: 'abc123' })).toBe('https://www.youtube.com/live/abc123');
    expect(canonicalWeb(channel)).toBe('https://www.youtube.com/channel/UC123');
    expect(canonicalWeb(handle)).toBe('https://www.youtube.com/@MrBeast');
    expect(canonicalWeb(playlist)).toBe('https://www.youtube.com/playlist?list=PL123');
  });

  test('iosScheme', () => {
    expect(iosScheme(video)).toBe('youtube://watch?v=dQw4w9WgXcQ');
    expect(iosScheme({ kind: 'live', id: 'abc123' })).toBe('youtube://watch?v=abc123');
    expect(iosScheme(shorts)).toBe('youtube://shorts/abc123');
    expect(iosScheme(channel)).toBe('youtube://channel/UC123');
    // handle y playlist → https universal link
    expect(iosScheme(handle)).toBe('https://www.youtube.com/@MrBeast');
    expect(iosScheme(playlist)).toBe('https://www.youtube.com/playlist?list=PL123');
  });

  test('androidIntent con browser_fallback_url url-encoded', () => {
    const intent = androidIntent(video);
    expect(intent).toBe(
      'intent://www.youtube.com/watch?v=dQw4w9WgXcQ#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=' +
        encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ') +
        ';end',
    );
    // shorts
    expect(androidIntent(shorts)).toContain('intent://www.youtube.com/shorts/abc123#Intent;');
    expect(androidIntent(shorts)).toContain('package=com.google.android.youtube');
  });
});
