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
      <h2>🔗 Links</h2>
      <button class="btn btn-primary" onclick="document.getElementById('modal').classList.remove('hidden')">
        + Nuevo link
      </button>
    </div>

    <!-- Modal crear link -->
    <div id="modal" class="modal hidden">
      <div class="modal-overlay" onclick="document.getElementById('modal').classList.add('hidden')"></div>
      <div class="modal-content">
        <h3>Crear nuevo link</h3>
        <form hx-post="/api/links" hx-target="#links-table" hx-swap="outerHTML"
              hx-on::after-request="document.getElementById('modal').classList.add('hidden'); this.reset()">
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
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal').classList.add('hidden')">Cancelar</button>
            <button type="submit" class="btn btn-primary">Crear link</button>
          </div>
        </form>
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
              <button class="btn btn-icon btn-danger"
                hx-delete="/api/links/${link.id}"
                hx-target="#link-row-${link.id}"
                hx-swap="outerHTML"
                hx-confirm="¿Eliminar este link? Esta acción no se puede deshacer.">
                🗑️
              </button>
              <a href="/stats/${link.id}" class="btn btn-icon">📊</a>
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

function formatDate(date: Date | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
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
  return c.html(renderLinksTable(allLinks, baseUrl));
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
    <td><a href="${baseUrl}/${link.slug}" target="_blank" class="slug-link">/${link.slug}</a>
    ${link.title ? `<span class="link-title">${link.title}</span>` : ''}</td>
    <td class="destination" title="${link.destination}">${truncate(link.destination, 50)}</td>
    <td class="visits-count">${link.visits}</td>
    <td><label class="toggle"><input type="checkbox" ${link.isActive ? 'checked' : ''}
      hx-patch="/api/links/${link.id}/toggle" hx-target="#link-row-${link.id}" hx-swap="outerHTML">
      <span class="slider"></span></label></td>
    <td class="date">${formatDate(link.createdAt)}</td>
    <td>
      <button class="btn btn-icon btn-danger" hx-delete="/api/links/${link.id}"
        hx-target="#link-row-${link.id}" hx-swap="outerHTML"
        hx-confirm="¿Eliminar este link?">🗑️</button>
      <a href="/stats/${link.id}" class="btn btn-icon">📊</a>
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
