import { describe, test, expect } from 'bun:test';
import { detectInAppBrowser } from './detect';

// UAs realistas de in-app browsers
const UAS = {
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 Instagram 297.0.0.33.109 Android (33/13; 420dpi; 1080x2200; Google/google; Pixel 7; panther; panther; es_ES; 512345678)',
  instagramIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 297.0.0.12.123 (iPhone14,2; iOS 17_0; es_ES; es-ES; scale=3.00; 1170x2532; 512345678)',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 12; SM-G991B Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.65 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/405.0.0.23.72;]',
  facebookIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/16.3;FBSS/3;FBID/phone;FBLC/es_ES;FBOP/5]',
  tiktokAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Mobile Safari/537.36 musical_ly_2023105010 (JSVersion2.2.0) BytedanceWebview/d8a21c6',
  tiktokIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_31.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/es Region/ES isDarkMode/0 Safari/604.1',
  xAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/TQ3A.230805.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.5790.166 Mobile Safari/537.36 TwitterAndroid',
  xIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/9.67',
  linkedinAndroid:
    'Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP1A.210812.015; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/94.0.4606.85 Mobile Safari/537.36 [LinkedInApp]/4.1.678.1',
  linkedinIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.1.258',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  safariIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  firefoxDesktop:
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0',
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  googlebot:
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

describe('detectInAppBrowser', () => {
  test('null o vacío → no in-app', () => {
    expect(detectInAppBrowser(null)).toEqual({ os: 'other', inApp: false });
    expect(detectInAppBrowser('')).toEqual({ os: 'other', inApp: false });
  });

  test('Instagram en Android y iOS', () => {
    expect(detectInAppBrowser(UAS.instagramAndroid)).toEqual({ os: 'android', inApp: true, app: 'instagram' });
    expect(detectInAppBrowser(UAS.instagramIOS)).toEqual({ os: 'ios', inApp: true, app: 'instagram' });
  });

  test('Facebook en Android y iOS', () => {
    expect(detectInAppBrowser(UAS.facebookAndroid)).toEqual({ os: 'android', inApp: true, app: 'facebook' });
    expect(detectInAppBrowser(UAS.facebookIOS)).toEqual({ os: 'ios', inApp: true, app: 'facebook' });
  });

  test('TikTok en Android y iOS', () => {
    expect(detectInAppBrowser(UAS.tiktokAndroid)).toEqual({ os: 'android', inApp: true, app: 'tiktok' });
    expect(detectInAppBrowser(UAS.tiktokIOS)).toEqual({ os: 'ios', inApp: true, app: 'tiktok' });
  });

  test('X (Twitter) en Android y iOS', () => {
    expect(detectInAppBrowser(UAS.xAndroid)).toEqual({ os: 'android', inApp: true, app: 'x' });
    expect(detectInAppBrowser(UAS.xIOS)).toEqual({ os: 'ios', inApp: true, app: 'x' });
  });

  test('LinkedIn en Android y iOS', () => {
    expect(detectInAppBrowser(UAS.linkedinAndroid)).toEqual({ os: 'android', inApp: true, app: 'linkedin' });
    expect(detectInAppBrowser(UAS.linkedinIOS)).toEqual({ os: 'ios', inApp: true, app: 'linkedin' });
  });

  test('navegadores normales → no in-app', () => {
    expect(detectInAppBrowser(UAS.chromeAndroid)).toEqual({ os: 'android', inApp: false });
    expect(detectInAppBrowser(UAS.safariIOS)).toEqual({ os: 'ios', inApp: false });
    expect(detectInAppBrowser(UAS.firefoxDesktop)).toEqual({ os: 'other', inApp: false });
    expect(detectInAppBrowser(UAS.chromeDesktop)).toEqual({ os: 'other', inApp: false });
  });

  test('Googlebot → no in-app', () => {
    expect(detectInAppBrowser(UAS.googlebot)).toEqual({ os: 'other', inApp: false });
  });
});
