export type DetectedOS = 'android' | 'ios' | 'other';

export interface InAppDetection {
  os: DetectedOS;
  inApp: boolean;
  app?: string;
  bot: boolean;
}

// Detección conservadora por substring (case-insensitive).
// Ante la duda → inApp: false: el redirect web NUNCA debe romperse.
const IN_APP_MARKERS: Array<{ app: string; markers: string[] }> = [
  { app: 'instagram', markers: ['instagram '] },
  { app: 'facebook', markers: ['fban', 'fbav', 'fb_iab'] },
  { app: 'tiktok', markers: ['musical_ly', 'bytedance', 'tiktok'] },
  { app: 'x', markers: ['twitter for iphone', 'twitterandroid'] },
  { app: 'linkedin', markers: ['linkedinapp'] },
];

// Bots, crawlers y unfurlers de previews de enlaces.
// Ojo: 'twitter for iphone'/'twitterandroid' son la APP de X, no bots.
const BOT_MARKERS = [
  'bot',
  'crawl',
  'spider',
  'slurp',
  'facebookexternalhit',
  'whatsapp',
  'telegram',
  'discordbot',
  'slackbot',
  'linkedinbot',
  'preview',
  'embedly',
  'iframely',
];

function detectOS(ua: string): DetectedOS {
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  return 'other';
}

export function detectInAppBrowser(userAgent: string | null): InAppDetection {
  if (!userAgent) return { os: 'other', inApp: false, bot: false };

  const ua = userAgent.toLowerCase();
  const os = detectOS(ua);
  const bot = BOT_MARKERS.some((m) => ua.includes(m));

  for (const { app, markers } of IN_APP_MARKERS) {
    if (markers.some((m) => ua.includes(m))) {
      return { os, inApp: true, app, bot };
    }
  }

  return { os, inApp: false, bot };
}
