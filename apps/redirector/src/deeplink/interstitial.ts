// Interstitial iOS: intenta abrir la app nativa vía scheme y, si no funciona,
// cae al https canónico en ~1.8s. Sin assets externos, <3KB, texto en español.

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
  schemeUrl: string;
  httpsUrl: string;
  appName: string;
}

export function buildInterstitial({ schemeUrl, httpsUrl, appName }: InterstitialOptions): string {
  const app = escapeHtml(appName);
  const https = escapeHtml(httpsUrl);
  const jsScheme = jsString(schemeUrl);
  const jsHttps = jsString(httpsUrl);

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
<noscript><meta http-equiv="refresh" content="0;url=${https}"></noscript>
</head>
<body>
<div class="box">
<p>Abriendo ${app}…</p>
<a class="btn" href="${https}" id="open">Abrir en ${app}</a>
<p class="small">Si no se abre automáticamente, toca el botón.</p>
</div>
<script>
(function(){
var scheme=${jsScheme},https=${jsHttps},start=Date.now();
try{window.location.replace(scheme);}catch(e){}
setTimeout(function(){
if(!document.hidden&&Date.now()-start<3000){window.location.replace(https);}
},1800);
document.getElementById('open').addEventListener('click',function(ev){
ev.preventDefault();window.location.replace(scheme);
setTimeout(function(){window.location.replace(https);},1800);
});
})();
</script>
</body>
</html>`;
}
