import { detectInAppBrowser } from './detect';
import { buildInterstitial } from './interstitial';
import { targets } from './targets/index';

export type DeepLinkDecision = { kind: 'plain' } | { kind: 'interstitial'; html: string };

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

  // Bots/unfurlers: los previews de enlaces deben resolver al destino web
  if (detection.bot) return PLAIN;

  const appName = target.name === 'youtube' ? 'YouTube' : target.name;
  const fallbackUrl = target.canonicalWeb(parsed);

  // Mecanismo replicado de openinapp (verificado en producción):
  // cualquier móvil (in-app o navegador normal) recibe la página con
  // navegación client-side; solo desktop/desconocido sigue con redirect.
  if (detection.os === 'android') {
    return {
      kind: 'interstitial',
      html: buildInterstitial({
        primaryUrl: target.androidIntent(parsed),
        fallbackUrl,
        appName,
        fallbackDelayMs: 1000,
      }),
    };
  }

  if (detection.os === 'ios') {
    return {
      kind: 'interstitial',
      html: buildInterstitial({
        primaryUrl: target.iosScheme(parsed),
        fallbackUrl,
        appName,
        fallbackDelayMs: 600,
      }),
    };
  }

  return PLAIN;
}
