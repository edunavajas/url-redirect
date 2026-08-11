// Target YouTube: parsea URLs de YouTube a una forma canónica y genera
// deep links (scheme iOS + intent Android).
import type { DeepLinkTarget } from './index';

export type YouTubeKind = 'video' | 'shorts' | 'live' | 'channel' | 'handle' | 'playlist';

export interface YouTubeParsed {
  kind: YouTubeKind;
  id: string;
}

const ID_RE = /^[\w-]+$/;

function isYouTubeHost(host: string): boolean {
  return host === 'youtube.com' || host.endsWith('.youtube.com');
}

function matchYouTube(url: URL): YouTubeParsed | null {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = path.slice(1).split('/')[0];
    return id && ID_RE.test(id) ? { kind: 'video', id } : null;
  }

  if (!isYouTubeHost(host)) return null;

  const segments = path.split('/').filter(Boolean);

  // /watch?v=<id>
  if (segments[0] === 'watch') {
    const id = url.searchParams.get('v');
    return id && ID_RE.test(id) ? { kind: 'video', id } : null;
  }

  // /shorts/<id> y /live/<id>
  if (segments[0] === 'shorts' || segments[0] === 'live') {
    const id = segments[1];
    return id && ID_RE.test(id) ? { kind: segments[0], id } : null;
  }

  // /channel/<id>
  if (segments[0] === 'channel') {
    const id = segments[1];
    return id && ID_RE.test(id) ? { kind: 'channel', id } : null;
  }

  // /@<handle>
  if (segments[0]?.startsWith('@')) {
    const id = segments[0].slice(1);
    return id && ID_RE.test(id) ? { kind: 'handle', id } : null;
  }

  // /playlist?list=<id>
  if (segments[0] === 'playlist') {
    const id = url.searchParams.get('list');
    return id && ID_RE.test(id) ? { kind: 'playlist', id } : null;
  }

  return null;
}

function canonicalWeb(parsed: YouTubeParsed): string {
  switch (parsed.kind) {
    case 'video':
      return `https://www.youtube.com/watch?v=${parsed.id}`;
    case 'shorts':
      return `https://www.youtube.com/shorts/${parsed.id}`;
    case 'live':
      return `https://www.youtube.com/live/${parsed.id}`;
    case 'channel':
      return `https://www.youtube.com/channel/${parsed.id}`;
    case 'handle':
      return `https://www.youtube.com/@${parsed.id}`;
    case 'playlist':
      return `https://www.youtube.com/playlist?list=${parsed.id}`;
  }
}

function iosScheme(parsed: YouTubeParsed): string {
  switch (parsed.kind) {
    case 'video':
    case 'live':
      return `youtube://watch?v=${parsed.id}`;
    case 'shorts':
      return `youtube://shorts/${parsed.id}`;
    case 'channel':
      return `youtube://channel/${parsed.id}`;
    // handle y playlist no tienen scheme fiable → https universal link
    // (iOS abre la app igualmente si está instalada)
    default:
      return canonicalWeb(parsed);
  }
}

function androidIntent(parsed: YouTubeParsed): string {
  const canonical = canonicalWeb(parsed);
  const u = new URL(canonical);
  const target = `${u.host}${u.pathname}${u.search}`;
  const fallback = encodeURIComponent(canonical);
  return `intent://${target}#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=${fallback};end`;
}

export const youtubeTarget: DeepLinkTarget<YouTubeParsed> = {
  name: 'youtube',
  match: matchYouTube,
  canonicalWeb,
  iosScheme,
  androidIntent,
};

// Re-exports con la interfaz pedida en el spec
export const match = matchYouTube;
export { canonicalWeb, iosScheme, androidIntent };
