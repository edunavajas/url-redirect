import { detectInAppBrowser } from './detect';
import { buildInterstitial } from './interstitial';
import { targets } from './targets/index';

export type DeepLinkDecision =
  | { kind: 'plain' }
  | { kind: 'intent'; location: string }
  | { kind: 'interstitial'; html: string };

export interface DeepLinkInput {
  destination: string;
  deepLinkEnabled: boolean;
  userAgent: string | null;
}

const PLAIN: DeepLinkDecision = { kind: 'plain' };

export function decideDeepLink({ destination, deepLinkEnabled, userAgent }: DeepLinkInput): DeepLinkDecision {
  if (!deepLinkEnabled) return PLAIN;
  // Kill-switch global en caliente
  if (process.env.DEEP_LINKS_DISABLED === 'true') return PLAIN;

  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return PLAIN;
  }

  let target: (typeof targets)[number] | null = null;
  let parsed: unknown = null;
  for (const t of targets) {
    const m = t.match(url);
    if (m) {
      target = t;
      parsed = m;
      break;
    }
  }
  if (!target) return PLAIN;

  const detection = detectInAppBrowser(userAgent);
  if (!detection.inApp) return PLAIN;

  if (detection.os === 'android') {
    return { kind: 'intent', location: target.androidIntent(parsed) };
  }

  if (detection.os === 'ios') {
    const html = buildInterstitial({
      schemeUrl: target.iosScheme(parsed),
      httpsUrl: target.canonicalWeb(parsed),
      appName: target.name === 'youtube' ? 'YouTube' : target.name,
    });
    return { kind: 'interstitial', html };
  }

  return PLAIN;
}
