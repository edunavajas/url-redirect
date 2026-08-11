// Registro de targets de deep link. Añadir una app nueva (Spotify, IG, X...)
// = crear un fichero en targets/ que exporte un DeepLinkTarget y añadirlo a `targets`.
export interface DeepLinkTarget<TParsed = unknown> {
  name: string;
  /** Parsea la URL de destino; null si no es de esta app o no es parseable. */
  match(url: URL): TParsed | null;
  /** URL https canónica (fallback web). */
  canonicalWeb(parsed: TParsed): string;
  /** URL scheme para iOS (o https si no hay scheme fiable). */
  iosScheme(parsed: TParsed): string;
  /** URI intent:// para Android con browser_fallback_url. */
  androidIntent(parsed: TParsed): string;
}

import { youtubeTarget } from './youtube';

export const targets: DeepLinkTarget[] = [youtubeTarget];
