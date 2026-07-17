import type { BioProfile, BioBlock } from '@url-redirect/db';
import { socialIconFor, socialNameFor, MAIL_ICON } from './icons';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeUrl(url: string): string | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  if (/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(trimmed)) return escapeHtml(trimmed);
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return escapeHtml(u.toString());
  } catch {
    return null;
  }
}

export function isBioConfigured(profile: BioProfile | null, blocks: BioBlock[]): boolean {
  const hasName = !!profile?.displayName?.trim();
  const hasBlocks = blocks.some(b => b.isActive);
  return hasName || hasBlocks;
}

export function mailtoEmail(url: string): string | null {
  const m = /^mailto:([^@\s]+@[^@\s]+\.[^@\s]+)$/i.exec((url || '').trim());
  return m ? m[1] : null;
}

export function sortBlocks(blocks: BioBlock[]): BioBlock[] {
  return [...blocks].sort((a, b) => a.position - b.position || a.id - b.id);
}

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

function css(accent: string): string {
  return `
*{box-sizing:border-box;margin:0;padding:0}
:root{--accent:${accent}}
html{-webkit-text-size-adjust:100%}
body{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,sans-serif;
  background:#060608;color:#fff;min-height:100vh;min-height:100dvh;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  line-height:1.45;
}
.bg{position:fixed;inset:0;z-index:-2;pointer-events:none;
  background:
    radial-gradient(600px 420px at 18% -6%, rgba(64,96,180,0.12), transparent 70%),
    radial-gradient(520px 380px at 85% 8%, rgba(120,80,170,0.10), transparent 70%),
    radial-gradient(700px 500px at 50% 110%, rgba(50,80,150,0.08), transparent 70%),
    #060608;
}
.bg::after{content:"";position:absolute;inset:0;background-image:${NOISE_SVG};opacity:0.03}
main{
  max-width:480px;margin:0 auto;width:100%;
  padding:calc(48px + env(safe-area-inset-top)) 20px calc(40px + env(safe-area-inset-bottom));
}
header{text-align:center;margin-bottom:28px}
.avatar{
  width:96px;height:96px;border-radius:28%;object-fit:cover;display:block;margin:0 auto 18px;
  box-shadow:0 0 0 1.5px color-mix(in srgb, var(--accent) 65%, transparent),
             0 12px 32px rgba(0,0,0,0.45);
  position:relative;
}
.avatar-wrap{position:relative;width:96px;margin:0 auto 18px}
.avatar-wrap .avatar{margin:0}
.avatar-wrap::after{
  content:"";position:absolute;inset:0;border-radius:28%;pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 38%);
}
.avatar-fallback{
  width:96px;height:96px;border-radius:28%;display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,0.06);font-size:36px;font-weight:600;color:rgba(255,255,255,0.7);
  box-shadow:0 0 0 1.5px color-mix(in srgb, var(--accent) 65%, transparent);
}
h1{font-size:22px;font-weight:600;letter-spacing:-0.02em}
.tagline{margin-top:6px;font-size:15px;color:rgba(255,255,255,0.55)}
.socials{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin:22px 0 30px}
.social-btn{
  width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,0.85);
  background:rgba(255,255,255,0.055);
  backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);
  border:1px solid rgba(255,255,255,0.09);
  transition:transform .25s cubic-bezier(0.22,1,0.36,1), border-color .25s, color .25s;
}
.social-btn svg{width:20px;height:20px}
.social-btn:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.22);color:#fff}
.social-btn:active{transform:scale(0.965);transition-duration:120ms}
.blocks{display:flex;flex-direction:column;gap:14px}
.section-title{
  font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.09em;
  color:rgba(255,255,255,0.42);text-align:center;margin:18px 0 2px;
}
#toast{
  position:fixed;bottom:24px;left:50%;transform:translate(-50%,8px);
  display:flex;align-items:center;gap:8px;z-index:10;pointer-events:none;
  background:rgba(255,255,255,0.09);
  backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);
  border:1px solid rgba(255,255,255,0.12);border-radius:999px;
  padding:10px 18px;font-size:14px;color:#fff;
  opacity:0;transition:opacity 250ms,transform 250ms;
}
#toast.show{opacity:1;transform:translate(-50%,0)}
#toast svg{width:16px;height:16px;flex-shrink:0}
.card{
  display:block;text-decoration:none;color:inherit;overflow:hidden;position:relative;
  background:rgba(255,255,255,0.055);
  backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);
  border:1px solid rgba(255,255,255,0.09);border-radius:20px;
  box-shadow:0 8px 32px rgba(0,0,0,0.35);
  transition:transform .35s cubic-bezier(0.22,1,0.36,1), border-color .35s;
}
.card::before{
  content:"";position:absolute;inset:0 0 auto 0;height:40%;pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0));
  border-radius:20px 20px 0 0;
}
.card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.2)}
.card:active{transform:scale(0.965);transition-duration:120ms}
.card-video .thumb{position:relative;aspect-ratio:16/9;overflow:hidden}
.card-video .thumb img{width:100%;height:100%;object-fit:cover;display:block}
.play{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:56px;height:56px;border-radius:50%;
  background:rgba(20,20,24,0.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.18);
  display:flex;align-items:center;justify-content:center;
  transition:transform .25s cubic-bezier(0.22,1,0.36,1), background .25s;
}
.card-video:hover .play{transform:translate(-50%,-50%) scale(1.08);background:color-mix(in srgb, var(--accent) 55%, rgba(20,20,24,0.55))}
.play svg{width:22px;height:22px;fill:#fff;margin-left:2px}
.card-body{padding:14px 18px}
.card-title{font-size:15px;font-weight:600;letter-spacing:-0.01em}
.card-sub{margin-top:3px;font-size:13px;color:rgba(255,255,255,0.5);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-promo .promo-img{width:100%;max-height:230px;object-fit:cover;display:block}
.card-link{display:flex;align-items:center;gap:14px;padding:12px 16px}
.card-link::before{display:none}
.link-thumb{width:40px;height:40px;border-radius:10px;object-fit:cover;flex-shrink:0}
.link-thumb-fallback{
  width:40px;height:40px;border-radius:10px;flex-shrink:0;
  background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);
}
.link-thumb-fallback svg{width:18px;height:18px;fill:currentColor}
.link-text{flex:1;min-width:0}
.link-text .card-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chevron{color:rgba(255,255,255,0.3);flex-shrink:0}
.chevron svg{width:18px;height:18px}
footer{
  text-align:center;margin-top:36px;font-size:11px;letter-spacing:0.02em;
  color:rgba(255,255,255,0.25);
}
.enter{animation:enter 600ms cubic-bezier(0.22,1,0.36,1) both}
@keyframes enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){
  .enter{animation:none}
  .card,.social-btn,.play{transition:none}
  #toast{transition:none}
}
`;
}

function faviconDataUri(accent: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='18' fill='${accent}'/><text x='32' y='45' font-family='-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' font-size='38' font-weight='700' fill='#fff' text-anchor='middle'>d</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

let stagger = 0;
function anim(): string {
  return `style="animation-delay:${stagger++ * 60}ms"`;
}

function renderSocial(block: BioBlock): string {
  const url = safeUrl(block.url);
  if (!url) return '';
  const label = escapeHtml(block.title || socialNameFor(block.url));
  const email = mailtoEmail(block.url);
  const copy = email ? ` data-copy="${escapeHtml(email)}"` : '';
  return `<a class="social-btn enter" ${anim()} href="${url}"${copy} target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}">${socialIconFor(block.url)}</a>`;
}

const PLAY_SVG = '<svg viewBox="0 0 24 24"><path d="M8 5.14v14l11-7-11-7z"/></svg>';
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
const LINK_ICON = '<svg viewBox="0 0 24 24"><path d="M10.59 13.41a1.996 1.996 0 0 0 2.82 0l3.77-3.77a2 2 0 1 0-2.83-2.83l1.42-1.42a4 4 0 1 1 5.66 5.66l-3.77 3.77a4 4 0 0 1-5.66 0 3.993 3.993 0 0 1-.53-.65l-1.41 1.42c.19.19.39.37.53.55zm2.82-2.82a1.996 1.996 0 0 0-2.82 0l-3.77 3.77a2 2 0 1 0 2.83 2.83l-1.42 1.42a4 4 0 1 1-5.66-5.66l3.77-3.77a4 4 0 0 1 5.66 0c.18.18.35.36.51.55l1.41-1.42a5.96 5.96 0 0 0-.51-.55z"/></svg>';

function renderVideo(block: BioBlock): string {
  const url = safeUrl(block.url);
  if (!url) return '';
  const thumb = safeUrl(block.thumbnailUrl);
  return `<a class="card card-video enter" ${anim()} href="${url}" target="_blank" rel="noopener noreferrer">
    <div class="thumb">
      ${thumb ? `<img src="${thumb}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
      <span class="play">${PLAY_SVG}</span>
    </div>
    ${block.title ? `<div class="card-body"><div class="card-title">${escapeHtml(block.title)}</div>${block.subtitle ? `<div class="card-sub">${escapeHtml(block.subtitle)}</div>` : ''}</div>` : ''}
  </a>`;
}

function renderPromo(block: BioBlock): string {
  const url = safeUrl(block.url);
  if (!url) return '';
  const img = safeUrl(block.thumbnailUrl);
  return `<a class="card card-promo enter" ${anim()} href="${url}" target="_blank" rel="noopener noreferrer">
    ${img ? `<img class="promo-img" src="${img}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
    <div class="card-body">
      ${block.title ? `<div class="card-title">${escapeHtml(block.title)}</div>` : ''}
      ${block.subtitle ? `<div class="card-sub">${escapeHtml(block.subtitle)}</div>` : ''}
    </div>
  </a>`;
}

function renderLink(block: BioBlock): string {
  const url = safeUrl(block.url);
  if (!url) return '';
  const thumb = safeUrl(block.thumbnailUrl);
  const email = mailtoEmail(block.url);
  const copy = email ? ` data-copy="${escapeHtml(email)}"` : '';
  const title = escapeHtml(block.title || block.url.replace(/^https?:\/\//, '').replace(/\/$/, ''));
  const subtitle = block.subtitle || email || '';
  return `<a class="card card-link enter" ${anim()} href="${url}"${copy} target="_blank" rel="noopener noreferrer">
    ${thumb
      ? `<img class="link-thumb" src="${thumb}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="link-thumb-fallback">${email ? MAIL_ICON : LINK_ICON}</span>`}
    <span class="link-text">
      <span class="card-title">${title}</span>
      ${subtitle ? `<span class="card-sub">${escapeHtml(subtitle)}</span>` : ''}
    </span>
    <span class="chevron">${CHEVRON_SVG}</span>
  </a>`;
}

function renderSection(block: BioBlock): string {
  const title = (block.title || '').trim();
  if (!title) return '';
  return `<h2 class="section-title enter" ${anim()}>${escapeHtml(title)}</h2>`;
}

export function renderBioPage(profile: BioProfile | null, blocks: BioBlock[]): string {
  stagger = 0;
  const p = profile ?? ({} as BioProfile);
  const accent = /^#[0-9a-fA-F]{6}$/.test(p.accentColor || '') ? p.accentColor : '#0a84ff';
  const name = (p.displayName || '').trim();
  const tagline = (p.tagline || '').trim();
  const avatar = safeUrl(p.avatarUrl || '');

  const active = sortBlocks(blocks.filter(b => b.isActive));
  const socials = active.filter(b => b.type === 'social');
  const rest = active.filter(b => b.type !== 'social');

  const pageTitle = escapeHtml(p.seoTitle || name || 'Links');
  const pageDesc = escapeHtml(p.seoDescription || tagline || '');

  const socialsHtml = socials.length
    ? `<div class="socials">${socials.map(renderSocial).join('')}</div>`
    : '';

  const blocksHtml = rest.map(b => {
    if (b.type === 'video') return renderVideo(b);
    if (b.type === 'promo') return renderPromo(b);
    if (b.type === 'section') return renderSection(b);
    return renderLink(b);
  }).join('');

  const avatarHtml = avatar
    ? `<div class="avatar-wrap enter" ${anim()}><img class="avatar" src="${avatar}" alt="${escapeHtml(name)}" referrerpolicy="no-referrer"></div>`
    : `<div class="avatar-wrap enter" ${anim()}><div class="avatar-fallback">${escapeHtml((name || '?').charAt(0).toUpperCase())}</div></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${pageTitle}</title>
${pageDesc ? `<meta name="description" content="${pageDesc}">` : ''}
<meta property="og:title" content="${pageTitle}">
${pageDesc ? `<meta property="og:description" content="${pageDesc}">` : ''}
${avatar ? `<meta property="og:image" content="${avatar}">` : ''}
<meta property="og:type" content="profile">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${faviconDataUri(accent)}">
<style>${css(accent)}</style>
</head>
<body>
<div class="bg"></div>
<main>
  <header>
    ${avatarHtml}
    ${name ? `<h1 class="enter" ${anim()}>${escapeHtml(name)}</h1>` : ''}
    ${tagline ? `<p class="tagline enter" ${anim()}>${escapeHtml(tagline)}</p>` : ''}
  </header>
  ${socialsHtml}
  <div class="blocks">${blocksHtml}</div>
  <footer class="enter" ${anim()}>devknives.link</footer>
</main>
<div id="toast" role="status" aria-live="polite"><svg viewBox="0 0 24 24" fill="none" stroke="#34c759" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span id="toast-msg"></span></div>
<script>
(function(){
  var toast = document.getElementById('toast');
  var toastMsg = document.getElementById('toast-msg');
  var timer = null;
  function showToast(msg) {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.add('show');
    if (timer) clearTimeout(timer);
    timer = setTimeout(function(){ toast.classList.remove('show'); }, 1800);
  }
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('[data-copy]') : null;
    if (!a || !navigator.clipboard) return;
    e.preventDefault();
    navigator.clipboard.writeText(a.getAttribute('data-copy')).then(
      function(){ showToast('Email copiado'); },
      function(){ window.location.href = a.href; }
    );
  });
})();
</script>
</body>
</html>`;
}
