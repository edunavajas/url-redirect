// Página de apertura: navegación client-side al estilo openinapp —
// window.location.replace(primaryUrl) inmediato (intent:// en Android,
// vnd.youtube:// en iOS) y fallback https si la app no se abre.
// Sin assets externos, <3KB, texto en español.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// String literal JS seguro (JSON.stringify + escape de '<' para no romper </script>)
function jsString(s: string): string {
  return JSON.stringify(s).replace(/</g, '\\u003c');
}

export interface InterstitialOptions {
  primaryUrl: string;
  fallbackUrl: string;
  appName: string;
  fallbackDelayMs: number;
}

export function buildInterstitial({ primaryUrl, fallbackUrl, appName, fallbackDelayMs }: InterstitialOptions): string {
  const app = escapeHtml(appName);
  const primary = escapeHtml(primaryUrl);
  const fallback = escapeHtml(fallbackUrl);
  const jsPrimary = jsString(primaryUrl);
  const jsFallback = jsString(fallbackUrl);
  const delay = Math.max(0, Math.floor(fallbackDelayMs));

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Abrir en ${app}</title>
<meta name="referrer" content="no-referrer">
<style>
body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#fff}
.box{text-align:center;padding:2rem;max-width:320px}
.btn{display:inline-block;margin-top:1.25rem;padding:.8rem 1.6rem;background:#c00;color:#fff;border-radius:999px;text-decoration:none;font-weight:600}
.small{margin-top:1rem;font-size:.8rem;color:#999}
</style>
<noscript><meta http-equiv="refresh" content="0;url=${fallback}"></noscript>
</head>
<body>
<div class="box">
<p>Abriendo ${app}…</p>
<a class="btn" href="${primary}" id="open">Abrir en ${app}</a>
<p class="small">Si no se abre automáticamente, toca el botón.</p>
</div>
<script>
(function(){
var primary=${jsPrimary},fallback=${jsFallback},delay=${delay};
function go(url){try{window.location.replace(url);}catch(e){window.location.href=url;}}
go(primary);
setTimeout(function(){if(!document.hidden){go(fallback);}},delay);
document.getElementById('open').addEventListener('click',function(ev){
ev.preventDefault();go(primary);
setTimeout(function(){if(!document.hidden){go(fallback);}},delay);
});
})();
</script>
</body>
</html>`;
}
