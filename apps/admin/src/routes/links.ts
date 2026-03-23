import { Hono } from 'hono';
import { db, schema } from '@url-redirect/db';
import { eq, desc, sql, count } from 'drizzle-orm';
import { layout } from '../views/layout';

const links = new Hono();

// GET /links → listado principal con HTMX
links.get('/', async (c) => {
  const allLinks = await db
    .select({
      id: schema.links.id,
      slug: schema.links.slug,
      destination: schema.links.destination,
      title: schema.links.title,
      isActive: schema.links.isActive,
      createdAt: schema.links.createdAt,
      visits: count(schema.visits.id),
    })
    .from(schema.links)
    .leftJoin(schema.visits, eq(schema.links.id, schema.visits.linkId))
    .groupBy(schema.links.id)
    .orderBy(desc(schema.links.createdAt));

  const baseUrl = process.env.REDIRECT_BASE_URL || 'http://localhost:3000';

  const content = `
    <div class="page-header">
      <h2>Links</h2>
      <button class="btn btn-primary" onclick="openModal('create-modal')">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Nuevo link
      </button>
    </div>

    <!-- Modal crear link -->
    <div id="create-modal" class="modal hidden">
      <div class="modal-overlay" onclick="closeModal('create-modal')"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Crear nuevo link</h3>
          <button class="btn btn-icon" onclick="closeModal('create-modal')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form hx-post="/api/links" hx-target="#links-table" hx-swap="outerHTML"
              hx-on::after-request="closeModal('create-modal'); this.reset()">
          <div class="form-group">
            <label>Slug (ej: mi-link)</label>
            <div class="input-prefix">
              <span class="prefix">${baseUrl}/</span>
              <input type="text" name="slug" placeholder="mi-link" pattern="[a-zA-Z0-9_-]+" required>
            </div>
          </div>
          <div class="form-group">
            <label>URL destino</label>
            <input type="url" name="destination" placeholder="https://..." required>
          </div>
          <div class="form-group">
            <label>Título (opcional)</label>
            <input type="text" name="title" placeholder="Descripción del link">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal('create-modal')">Cancelar</button>
            <button type="submit" class="btn btn-primary">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Crear link
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal editar link -->
    <div id="edit-modal" class="modal hidden">
      <div class="modal-overlay" onclick="closeModal('edit-modal')"></div>
      <div class="modal-content" id="edit-modal-content">
        <!-- Content loaded dynamically -->
      </div>
    </div>

    <!-- Modal historial -->
    <div id="history-modal" class="modal hidden">
      <div class="modal-overlay" onclick="closeModal('history-modal')"></div>
      <div class="modal-content modal-large" id="history-modal-content">
        <!-- Content loaded dynamically -->
      </div>
    </div>

    <!-- Tabla de links -->
    ${renderLinksTable(allLinks, baseUrl)}
  `;

  return c.html(layout('Links', content));
});

function renderLinksTable(allLinks: any[], baseUrl: string) {
  return `<div id="links-table">
    <table class="table">
      <thead>
        <tr>
          <th>Slug</th>
          <th>Destino</th>
          <th>Visitas</th>
          <th>Estado</th>
          <th>Creado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${allLinks.length === 0 ? '<tr><td colspan="6" class="empty">No hay links creados aún</td></tr>' : ''}
        ${allLinks.map(link => `
          <tr id="link-row-${link.id}">
            <td>
              <a href="${baseUrl}/${link.slug}" target="_blank" class="slug-link">
                /${link.slug}
              </a>
              ${link.title ? `<span class="link-title">${link.title}</span>` : ''}
            </td>
            <td class="destination" title="${link.destination}">${truncate(link.destination, 50)}</td>
            <td class="visits-count">${link.visits}</td>
            <td>
              <label class="toggle">
                <input type="checkbox" ${link.isActive ? 'checked' : ''}
                  hx-patch="/api/links/${link.id}/toggle"
                  hx-target="#link-row-${link.id}"
                  hx-swap="outerHTML">
                <span class="slider"></span>
              </label>
            </td>
            <td class="date">${formatDate(link.createdAt)}</td>
            <td>
              <div class="action-buttons">
                <button
                  class="btn btn-icon btn-ghost"
                  onclick="navigator.clipboard.writeText('${baseUrl}/${link.slug}').then(()=>showToast('Link copiado')).catch(()=>showToast('Error al copiar'))"
                  title="Copiar link"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button class="btn btn-icon btn-ghost"
                  hx-get="/links/${link.id}/edit"
                  hx-target="#edit-modal-content"
                  hx-on::after-request="openModal('edit-modal')"
                  title="Editar link"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="btn btn-icon btn-ghost"
                  hx-get="/links/${link.id}/history"
                  hx-target="#history-modal-content"
                  hx-on::after-request="openModal('history-modal')"
                  title="Ver historial"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </button>
                <a href="/stats/${link.id}" class="btn btn-icon btn-ghost" title="Estadísticas">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </a>
                <button class="btn btn-icon btn-danger"
                  hx-delete="/api/links/${link.id}"
                  hx-target="#link-row-${link.id}"
                  hx-swap="outerHTML"
                  hx-confirm="¿Eliminar este link? Esta acción no se puede deshacer."
                  title="Eliminar link"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatDate(date: Date | number | null) {
  if (!date) return '-';
  const d = typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(timestamp: number | null) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return d.toLocaleString('es-ES', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// GET /links/:id/edit - Return edit form with current values
links.get('/:id/edit', async (c) => {
  const id = parseInt(c.req.param('id'));
  const baseUrl = process.env.REDIRECT_BASE_URL || 'http://localhost:3000';
  
  const link = await db.select().from(schema.links).where(eq(schema.links.id, id)).limit(1);
  
  if (!link.length) {
    return c.html('<div class="error">Link no encontrado</div>', 404);
  }

  const l = link[0];
  
  return c.html(`
    <div class="modal-header">
      <h3>Editar link</h3>
      <button class="btn btn-icon" onclick="closeModal('edit-modal')">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <form hx-post="/links/${id}/edit" hx-target="#links-table" hx-swap="outerHTML"
          hx-on::after-request="closeModal('edit-modal')">
      <div class="form-group">
        <label>Slug</label>
        <div class="input-prefix">
          <span class="prefix">${baseUrl}/</span>
          <input type="text" name="slug" value="${l.slug}" pattern="[a-zA-Z0-9_-]+" required>
        </div>
      </div>
      <div class="form-group">
        <label>URL destino</label>
        <input type="url" name="destination" value="${l.destination}" required>
      </div>
      <div class="form-group">
        <label>Título</label>
        <input type="text" name="title" value="${l.title || ''}" placeholder="Descripción del link">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal('edit-modal')">Cancelar</button>
        <button type="submit" class="btn btn-primary">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Guardar cambios
        </button>
      </div>
    </form>
  `);
});

// POST /links/:id/edit - Update link and log to history
links.post('/:id/edit', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.parseBody();
  
  const newSlug = (body['slug'] as string)?.trim();
  const newDestination = (body['destination'] as string)?.trim();
  const newTitle = (body['title'] as string)?.trim() || null;

  if (!newSlug || !newDestination) {
    return c.html('<div class="error">Slug y destino son requeridos</div>', 400);
  }

  // Get current link values
  const current = await db.select().from(schema.links).where(eq(schema.links.id, id)).limit(1);
  if (!current.length) {
    return c.html('<div class="error">Link no encontrado</div>', 404);
  }

  const oldLink = current[0];
  const historyEntries: Array<{ linkId: number; fieldName: string; oldValue: string | null; newValue: string | null }> = [];

  // Track changes for history
  if (oldLink.slug !== newSlug) {
    historyEntries.push({ linkId: id, fieldName: 'slug', oldValue: oldLink.slug, newValue: newSlug });
  }
  if (oldLink.destination !== newDestination) {
    historyEntries.push({ linkId: id, fieldName: 'destination', oldValue: oldLink.destination, newValue: newDestination });
  }
  if (oldLink.title !== newTitle) {
    historyEntries.push({ linkId: id, fieldName: 'title', oldValue: oldLink.title, newValue: newTitle });
  }

  try {
    // Update the link
    await db.update(schema.links)
      .set({ slug: newSlug, destination: newDestination, title: newTitle })
      .where(eq(schema.links.id, id));

    // Insert history entries
    if (historyEntries.length > 0) {
      await db.insert(schema.linkHistory).values(historyEntries);
    }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return c.html('<div class="error">El slug ya existe</div>', 409);
    }
    return c.html('<div class="error">Error al actualizar el link</div>', 500);
  }

  // Return updated table
  const allLinks = await db
    .select({
      id: schema.links.id,
      slug: schema.links.slug,
      destination: schema.links.destination,
      title: schema.links.title,
      isActive: schema.links.isActive,
      createdAt: schema.links.createdAt,
      visits: count(schema.visits.id),
    })
    .from(schema.links)
    .leftJoin(schema.visits, eq(schema.links.id, schema.visits.linkId))
    .groupBy(schema.links.id)
    .orderBy(desc(schema.links.createdAt));

  const baseUrl = process.env.REDIRECT_BASE_URL || 'http://localhost:3000';
  
  const successToast = `
    <div id="toast" class="toast toast-success" hx-swap-oob="true">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Link actualizado correctamente
    </div>
  `;

  return c.html(successToast + renderLinksTable(allLinks, baseUrl));
});

// GET /links/:id/history - Show edit history for a link
links.get('/:id/history', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  const link = await db.select().from(schema.links).where(eq(schema.links.id, id)).limit(1);
  if (!link.length) {
    return c.html('<div class="error">Link no encontrado</div>', 404);
  }

  const history = await db
    .select()
    .from(schema.linkHistory)
    .where(eq(schema.linkHistory.linkId, id))
    .orderBy(desc(schema.linkHistory.editedAt));

  const baseUrl = process.env.REDIRECT_BASE_URL || 'http://localhost:3000';
  const l = link[0];

  return c.html(`
    <div class="modal-header">
      <h3>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Historial de cambios
      </h3>
      <button class="btn btn-icon" onclick="closeModal('history-modal')">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <div class="link-info">
        <div class="link-info-item">
          <span class="link-info-label">Slug actual:</span>
          <a href="${baseUrl}/${l.slug}" target="_blank" class="slug-link">/${l.slug}</a>
        </div>
        ${l.title ? `<div class="link-info-item"><span class="link-info-label">Título:</span> ${l.title}</div>` : ''}
      </div>
      
      ${history.length === 0 
        ? '<div class="empty-state"><svg class="icon empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><p>No hay cambios registrados para este link.</p></div>'
        : `<div class="history-list">
            ${history.map(h => `
              <div class="history-item">
                <div class="history-header">
                  <span class="history-field">${getFieldLabel(h.fieldName)}</span>
                  <span class="history-date">${formatDateTime(h.editedAt)}</span>
                </div>
                <div class="history-changes">
                  <div class="history-old">
                    <span class="history-label">Antes:</span>
                    <span class="history-value" title="${h.oldValue || '(vacío)'}">${truncate(h.oldValue || '(vacío)', 40)}</span>
                  </div>
                  <div class="history-arrow">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </div>
                  <div class="history-new">
                    <span class="history-label">Después:</span>
                    <span class="history-value" title="${h.newValue || '(vacío)'}">${truncate(h.newValue || '(vacío)', 40)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>`
      }
    </div>
  `);
});

function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    slug: 'Slug',
    destination: 'Destino',
    title: 'Título',
  };
  return labels[fieldName] || fieldName;
}

// API: crear link
links.post('/', async (c) => {
  const body = await c.req.parseBody();
  const slug = (body['slug'] as string)?.toLowerCase().trim();
  const destination = body['destination'] as string;
  const title = body['title'] as string || null;

  if (!slug || !destination) {
    return c.html('<div class="error">Slug y destino son requeridos</div>', 400);
  }

  try {
    await db.insert(schema.links).values({ slug, destination, title });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return c.html('<div class="error">El slug ya existe</div>', 409);
    }
    return c.html('<div class="error">Error al crear el link</div>', 500);
  }

  // Devolver tabla actualizada
  const allLinks = await db
    .select({
      id: schema.links.id,
      slug: schema.links.slug,
      destination: schema.links.destination,
      title: schema.links.title,
      isActive: schema.links.isActive,
      createdAt: schema.links.createdAt,
      visits: count(schema.visits.id),
    })
    .from(schema.links)
    .leftJoin(schema.visits, eq(schema.links.id, schema.visits.linkId))
    .groupBy(schema.links.id)
    .orderBy(desc(schema.links.createdAt));

  const baseUrl = process.env.REDIRECT_BASE_URL || 'http://localhost:3000';

  // Add success banner with copy button (HTMX OOB swap)
  const fullUrl = `${baseUrl}/${slug}`;
  const successBanner = `
    <div id="create-success" class="success-banner" hx-swap-oob="true">
      <span>✅ Link creado: <a href="${fullUrl}" target="_blank">${fullUrl}</a></span>
      <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${fullUrl}').then(()=>{this.textContent='✅ Copiado!';setTimeout(()=>this.textContent='📋 Copiar',2000)})">📋 Copiar</button>
    </div>
  `;

  return c.html(successBanner + renderLinksTable(allLinks, baseUrl));
});

// API: toggle activo/inactivo
links.patch('/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'));
  const current = await db.select().from(schema.links).where(eq(schema.links.id, id)).limit(1);
  if (!current.length) return c.html('', 404);

  await db.update(schema.links).set({ isActive: !current[0].isActive }).where(eq(schema.links.id, id));

  const updated = await db
    .select({
      id: schema.links.id,
      slug: schema.links.slug,
      destination: schema.links.destination,
      title: schema.links.title,
      isActive: schema.links.isActive,
      createdAt: schema.links.createdAt,
      visits: count(schema.visits.id),
    })
    .from(schema.links)
    .leftJoin(schema.visits, eq(schema.visits.linkId, schema.links.id))
    .where(eq(schema.links.id, id))
    .groupBy(schema.links.id)
    .limit(1);

  const baseUrl = process.env.REDIRECT_BASE_URL || 'http://localhost:3000';
  const link = updated[0];
  return c.html(renderLinkRow(link, baseUrl));
});

function renderLinkRow(link: any, baseUrl: string) {
  return `<tr id="link-row-${link.id}">
    <td>
      <a href="${baseUrl}/${link.slug}" target="_blank" class="slug-link">/${link.slug}</a>
      ${link.title ? `<span class="link-title">${link.title}</span>` : ''}
    </td>
    <td class="destination" title="${link.destination}">${truncate(link.destination, 50)}</td>
    <td class="visits-count">${link.visits}</td>
    <td>
      <label class="toggle">
        <input type="checkbox" ${link.isActive ? 'checked' : ''}
          hx-patch="/api/links/${link.id}/toggle"
          hx-target="#link-row-${link.id}"
          hx-swap="outerHTML">
        <span class="slider"></span>
      </label>
    </td>
    <td class="date">${formatDate(link.createdAt)}</td>
    <td>
      <div class="action-buttons">
        <button
          class="btn btn-icon btn-ghost"
          onclick="navigator.clipboard.writeText('${baseUrl}/${link.slug}').then(()=>showToast('Link copiado')).catch(()=>showToast('Error al copiar'))"
          title="Copiar link"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button class="btn btn-icon btn-ghost"
          hx-get="/links/${link.id}/edit"
          hx-target="#edit-modal-content"
          hx-on::after-request="openModal('edit-modal')"
          title="Editar link"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn btn-icon btn-ghost"
          hx-get="/links/${link.id}/history"
          hx-target="#history-modal-content"
          hx-on::after-request="openModal('history-modal')"
          title="Ver historial"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
        <a href="/stats/${link.id}" class="btn btn-icon btn-ghost" title="Estadísticas">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </a>
        <button class="btn btn-icon btn-danger"
          hx-delete="/api/links/${link.id}"
          hx-target="#link-row-${link.id}"
          hx-swap="outerHTML"
          hx-confirm="¿Eliminar este link?"
          title="Eliminar link"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </td>
  </tr>`;
}

// API: eliminar link
links.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(schema.links).where(eq(schema.links.id, id));
  return c.html(''); // HTMX swap vacío elimina la fila
});

export default links;
export { renderLinksTable };
