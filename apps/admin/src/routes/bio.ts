import { Hono } from 'hono';
import { db, schema } from '@url-redirect/db';
import { eq, asc } from 'drizzle-orm';
import { layout } from '../views/layout';
import { fetchOg } from '../lib/og';
import { isValidHexColor, isValidHttpUrlOrEmpty, validateBlockInput, parseReorderIds } from '../lib/validate';
import type { BioProfile, BioBlock } from '@url-redirect/db';

const bio = new Hono();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getProfile(): Promise<BioProfile> {
  const rows = await db.select().from(schema.bioProfile).where(eq(schema.bioProfile.id, 1)).limit(1);
  if (rows.length) return rows[0];
  const now = Date.now();
  await db.insert(schema.bioProfile).values({ id: 1, createdAt: now, updatedAt: now }).onConflictDoNothing();
  const retry = await db.select().from(schema.bioProfile).where(eq(schema.bioProfile.id, 1)).limit(1);
  return retry[0];
}

async function getBlocks(): Promise<BioBlock[]> {
  return db.select().from(schema.bioBlocks).orderBy(asc(schema.bioBlocks.position), asc(schema.bioBlocks.id));
}

const TYPE_LABELS: Record<string, string> = {
  social: 'Social',
  link: 'Link',
  video: 'Vídeo',
  promo: 'Promo',
  section: 'Sección',
};

function renderBlockItem(b: BioBlock): string {
  return `
  <div class="bio-block" data-id="${b.id}" id="bio-block-${b.id}">
    <span class="drag-handle" title="Arrastrar para reordenar">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="8" y1="6" x2="8" y2="6.01"></line><line x1="8" y1="12" x2="8" y2="12.01"></line><line x1="8" y1="18" x2="8" y2="18.01"></line>
        <line x1="16" y1="6" x2="16" y2="6.01"></line><line x1="16" y1="12" x2="16" y2="12.01"></line><line x1="16" y1="18" x2="16" y2="18.01"></line>
      </svg>
    </span>
    <span class="bio-block-type type-${b.type}">${TYPE_LABELS[b.type] || b.type}</span>
    <span class="bio-block-info">
      <span class="bio-block-title">${escapeHtml(b.title || b.url)}</span>
      ${b.title && b.type !== 'section' ? `<span class="bio-block-url">${escapeHtml(b.url)}</span>` : ''}
    </span>
    <label class="toggle">
      <input type="checkbox" ${b.isActive ? 'checked' : ''}
        hx-patch="/api/bio/blocks/${b.id}/toggle"
        hx-target="#bio-block-${b.id}"
        hx-swap="outerHTML">
      <span class="slider"></span>
    </label>
    <div class="action-buttons">
      <button class="btn btn-icon btn-ghost"
        hx-get="/bio/blocks/${b.id}/edit"
        hx-target="#block-modal-content"
        hx-on::after-request="openModal('block-modal')"
        title="Editar bloque">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button class="btn btn-icon btn-danger"
        hx-delete="/api/bio/blocks/${b.id}"
        hx-target="#bio-block-${b.id}"
        hx-swap="outerHTML"
        hx-confirm="¿Eliminar este bloque?"
        title="Eliminar bloque">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>`;
}

function renderBlocksList(blocks: BioBlock[]): string {
  if (!blocks.length) {
    return '<div class="bio-empty" id="bio-blocks-list">No hay bloques todavía. Crea el primero.</div>';
  }
  return `<div id="bio-blocks-list">${blocks.map(renderBlockItem).join('')}</div>`;
}

function blockForm(b?: BioBlock): string {
  const isEdit = !!b;
  const action = isEdit ? `/api/bio/blocks/${b!.id}` : '/api/bio/blocks';
  const method = isEdit ? 'hx-patch' : 'hx-post';
  return `
    <div class="modal-header">
      <h3>${isEdit ? 'Editar bloque' : 'Nuevo bloque'}</h3>
      <button class="btn btn-icon" onclick="closeModal('block-modal')">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <form ${method}="${action}" hx-target="#bio-blocks-wrap" hx-swap="innerHTML"
          hx-on::after-request="closeModal('block-modal')">
      <div class="form-group">
        <label>Tipo</label>
        <select name="type" id="block-type" onchange="syncBlockTypeFields()">
          ${Object.entries(TYPE_LABELS).map(([v, l]) =>
            `<option value="${v}" ${b?.type === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="fg-url">
        <label>URL</label>
        <div class="url-row">
          <input type="text" name="url" id="block-url" value="${escapeHtml(b?.url || '')}" placeholder="https://...">
          <button type="button" class="btn btn-secondary" id="og-fill-btn" onclick="autoFillOg()">Auto-rellenar</button>
        </div>
        <div id="og-status" class="og-status"></div>
      </div>
      <div class="form-group">
        <label>Título <span class="label-hint">(opcional en social)</span></label>
        <input type="text" name="title" id="block-title" value="${escapeHtml(b?.title || '')}" placeholder="Título del bloque">
      </div>
      <div class="form-group" id="fg-subtitle">
        <label>Subtítulo</label>
        <input type="text" name="subtitle" id="block-subtitle" value="${escapeHtml(b?.subtitle || '')}" placeholder="Descripción corta">
      </div>
      <div class="form-group" id="fg-thumbnail">
        <label>Imagen (URL)</label>
        <input type="text" name="thumbnail_url" id="block-thumbnail" value="${escapeHtml(b?.thumbnailUrl || '')}" placeholder="https://..." oninput="updateThumbPreview()">
        <div id="thumb-preview" class="thumb-preview">${b?.thumbnailUrl ? `<img src="${escapeHtml(b.thumbnailUrl)}" alt="">` : ''}</div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal('block-modal')">Cancelar</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar cambios' : 'Crear bloque'}</button>
      </div>
    </form>`;
}

// ─── Vista principal ───
bio.get('/', async (c) => {
  const [profile, blocks] = await Promise.all([getProfile(), getBlocks()]);
  const publicUrl = process.env.REDIRECT_BASE_URL || 'http://localhost:3000';

  const content = `
    <div class="page-header">
      <h2>Bio page</h2>
      <div class="action-buttons">
        <a href="${publicUrl}/" target="_blank" class="btn btn-secondary">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Ver página pública
        </a>
      </div>
    </div>

    <div class="detail-card">
      <h3>Perfil</h3>
      <form hx-post="/api/bio/profile" hx-target="#profile-saved" hx-swap="innerHTML">
        <div class="profile-grid">
          <div class="avatar-preview">
            <img id="avatar-preview-img" src="${escapeHtml(profile.avatarUrl)}" alt="" ${profile.avatarUrl ? '' : 'style="display:none"'}>
            <div id="avatar-preview-empty" class="avatar-preview-empty" ${profile.avatarUrl ? 'style="display:none"' : ''}>?</div>
          </div>
          <div class="profile-fields">
            <div class="form-group">
              <label>Avatar URL</label>
              <input type="text" name="avatar_url" value="${escapeHtml(profile.avatarUrl)}" placeholder="https://..."
                oninput="const i=document.getElementById('avatar-preview-img'),e=document.getElementById('avatar-preview-empty');if(this.value){i.src=this.value;i.style.display='';e.style.display='none'}else{i.style.display='none';e.style.display=''}">
            </div>
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" name="display_name" value="${escapeHtml(profile.displayName)}" placeholder="Tu nombre">
            </div>
            <div class="form-group">
              <label>Tagline</label>
              <input type="text" name="tagline" value="${escapeHtml(profile.tagline)}" placeholder="Una frase corta sobre ti">
            </div>
            <div class="form-group">
              <label>Color de acento</label>
              <input type="color" name="accent_color" value="${escapeHtml(profile.accentColor || '#0a84ff')}" class="color-input">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>SEO título</label>
          <input type="text" name="seo_title" value="${escapeHtml(profile.seoTitle)}" placeholder="Título para compartir / buscadores">
        </div>
        <div class="form-group">
          <label>SEO descripción</label>
          <input type="text" name="seo_description" value="${escapeHtml(profile.seoDescription)}" placeholder="Descripción para compartir / buscadores">
        </div>
        <div id="profile-saved"></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Guardar perfil</button>
        </div>
      </form>
    </div>

    <div class="detail-card">
      <div class="blocks-header">
        <h3>Bloques</h3>
        <button class="btn btn-primary btn-sm"
          hx-get="/bio/blocks/new"
          hx-target="#block-modal-content"
          hx-on::after-request="openModal('block-modal')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo bloque
        </button>
      </div>
      <p class="blocks-hint">Arrastra los bloques para reordenarlos. Los cambios se guardan automáticamente.</p>
      <div id="bio-blocks-wrap">
        ${renderBlocksList(blocks)}
      </div>
    </div>

    <div id="block-modal" class="modal hidden">
      <div class="modal-overlay" onclick="closeModal('block-modal')"></div>
      <div class="modal-content" id="block-modal-content"></div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
    <script>
      function initSortable() {
        const list = document.getElementById('bio-blocks-list');
        if (!list || list.dataset.sortableInit) return;
        list.dataset.sortableInit = '1';
        new Sortable(list, {
          handle: '.drag-handle',
          animation: 150,
          onEnd: function() {
            const ids = Array.from(list.querySelectorAll('.bio-block')).map(el => parseInt(el.dataset.id));
            fetch('/api/bio/blocks/reorder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ids),
            }).then(r => {
              if (r.ok) showToast('Orden guardado');
              else showToast('Error al guardar el orden', 'error');
            }).catch(() => showToast('Error al guardar el orden', 'error'));
          }
        });
      }
      initSortable();
      syncBlockTypeFields();
      document.body.addEventListener('htmx:afterSwap', function() { initSortable(); syncBlockTypeFields(); });

      function syncBlockTypeFields() {
        const sel = document.getElementById('block-type');
        if (!sel) return;
        const isSection = sel.value === 'section';
        const urlInput = document.getElementById('block-url');
        const subInput = document.getElementById('block-subtitle');
        const thumbInput = document.getElementById('block-thumbnail');
        const fgUrl = document.getElementById('fg-url');
        const fgSub = document.getElementById('fg-subtitle');
        const fgThumb = document.getElementById('fg-thumbnail');
        if (fgUrl) fgUrl.style.display = isSection ? 'none' : '';
        if (fgSub) fgSub.style.display = isSection ? 'none' : '';
        if (fgThumb) fgThumb.style.display = isSection ? 'none' : '';
        if (urlInput) { urlInput.disabled = isSection; urlInput.required = !isSection; }
        if (subInput) subInput.disabled = isSection;
        if (thumbInput) thumbInput.disabled = isSection;
      }

      function updateThumbPreview() {
        const input = document.getElementById('block-thumbnail');
        const preview = document.getElementById('thumb-preview');
        if (input && preview) {
          preview.innerHTML = input.value ? '<img src="' + input.value.replace(/"/g, '&quot;') + '" alt="">' : '';
        }
      }

      function autoFillOg() {
        const url = document.getElementById('block-url').value.trim();
        const status = document.getElementById('og-status');
        const btn = document.getElementById('og-fill-btn');
        if (!url) { status.textContent = 'Introduce una URL primero'; status.className = 'og-status og-error'; return; }
        btn.disabled = true;
        status.textContent = 'Obteniendo datos...';
        status.className = 'og-status og-loading';
        fetch('/api/og?url=' + encodeURIComponent(url))
          .then(r => r.json().then(d => ({ ok: r.ok, d })))
          .then(({ ok, d }) => {
            if (!ok) throw new Error(d.error || 'No se pudo obtener');
            if (d.title && !document.getElementById('block-title').value) {
              document.getElementById('block-title').value = d.title;
            }
            if (d.description && !document.getElementById('block-subtitle').value) {
              document.getElementById('block-subtitle').value = d.description;
            }
            if (d.image) {
              document.getElementById('block-thumbnail').value = d.image;
              updateThumbPreview();
            }
            status.textContent = '';
            status.className = 'og-status';
          })
          .catch(e => {
            status.textContent = (e.message || 'No se pudo obtener') + ' — rellena los campos a mano';
            status.className = 'og-status og-error';
          })
          .finally(() => { btn.disabled = false; });
      }
    </script>
  `;

  return c.html(layout('Bio', content));
});

// ─── Formularios modal ───
bio.get('/blocks/new', (c) => c.html(blockForm()));

bio.get('/blocks/:id/edit', async (c) => {
  const id = parseInt(c.req.param('id'));
  const rows = await db.select().from(schema.bioBlocks).where(eq(schema.bioBlocks.id, id)).limit(1);
  if (!rows.length) return c.html('<div class="error">Bloque no encontrado</div>', 404);
  return c.html(blockForm(rows[0]));
});

// ─── API: perfil ───
bio.post('/profile', async (c) => {
  const body = await c.req.parseBody();
  const displayName = String(body['display_name'] ?? '').trim();
  const tagline = String(body['tagline'] ?? '').trim();
  const avatarUrl = String(body['avatar_url'] ?? '').trim();
  const accentColor = String(body['accent_color'] ?? '').trim() || '#0a84ff';
  const seoTitle = String(body['seo_title'] ?? '').trim();
  const seoDescription = String(body['seo_description'] ?? '').trim();

  if (!isValidHexColor(accentColor)) {
    return c.html('<div class="error">Color de acento no válido (formato #rrggbb)</div>', 400);
  }
  for (const [label, url] of [['Avatar', avatarUrl]] as const) {
    if (url && !isValidHttpUrlOrEmpty(url)) {
      return c.html(`<div class="error">URL de ${label} no válida (solo http/https)</div>`, 400);
    }
  }

  await getProfile();
  await db.update(schema.bioProfile)
    .set({ displayName, tagline, avatarUrl, accentColor, seoTitle, seoDescription, updatedAt: Date.now() })
    .where(eq(schema.bioProfile.id, 1));

  return c.html('<div class="success-banner" style="margin-top:1rem">Perfil guardado</div>');
});

// ─── API: bloques ───
bio.post('/blocks', async (c) => {
  const body = await c.req.parseBody();
  const v = validateBlockInput(body);
  if (!v.ok) return c.html(`<div class="error">${v.error}</div>`, 400);

  const existing = await getBlocks();
  const maxPos = existing.reduce((m, b) => Math.max(m, b.position), -1);
  const now = Date.now();
  await db.insert(schema.bioBlocks).values({
    ...v.data,
    position: maxPos + 1,
    createdAt: now,
    updatedAt: now,
  });

  return c.html(renderBlocksList(await getBlocks()));
});

bio.patch('/blocks/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.parseBody();
  const v = validateBlockInput(body);
  if (!v.ok) return c.html(`<div class="error">${v.error}</div>`, 400);

  const rows = await db.select().from(schema.bioBlocks).where(eq(schema.bioBlocks.id, id)).limit(1);
  if (!rows.length) return c.html('<div class="error">Bloque no encontrado</div>', 404);

  await db.update(schema.bioBlocks)
    .set({ ...v.data, updatedAt: Date.now() })
    .where(eq(schema.bioBlocks.id, id));

  return c.html(renderBlocksList(await getBlocks()));
});

bio.patch('/blocks/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'));
  const rows = await db.select().from(schema.bioBlocks).where(eq(schema.bioBlocks.id, id)).limit(1);
  if (!rows.length) return c.html('', 404);

  await db.update(schema.bioBlocks)
    .set({ isActive: !rows[0].isActive, updatedAt: Date.now() })
    .where(eq(schema.bioBlocks.id, id));

  const updated = await db.select().from(schema.bioBlocks).where(eq(schema.bioBlocks.id, id)).limit(1);
  return c.html(renderBlockItem(updated[0]));
});

bio.delete('/blocks/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(schema.bioBlocks).where(eq(schema.bioBlocks.id, id));
  return c.html('');
});

bio.post('/blocks/reorder', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body JSON esperado: array de ids' }, 400);
  }
  const ids = parseReorderIds(body);
  if (!ids) return c.json({ error: 'Array de ids enteros únicos esperado' }, 400);

  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(schema.bioBlocks)
        .set({ position: i })
        .where(eq(schema.bioBlocks.id, ids[i]));
    }
  });

  return c.json({ ok: true, count: ids.length });
});

export default bio;
