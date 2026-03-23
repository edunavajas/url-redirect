import { Hono } from 'hono';
import { db, schema } from '@url-redirect/db';
import { eq, desc, count, sql } from 'drizzle-orm';
import { layout } from '../views/layout';

const stats = new Hono();

stats.get('/:linkId', async (c) => {
  const linkId = parseInt(c.req.param('linkId'));

  const link = await db.select().from(schema.links).where(eq(schema.links.id, linkId)).limit(1);
  if (!link.length) return c.html('<h1>Link no encontrado</h1>', 404);

  const totalVisits = await db
    .select({ count: count() })
    .from(schema.visits)
    .where(eq(schema.visits.linkId, linkId));

  // Visitas por día (últimos 30 días)
  const visitsByDay = await db
    .select({
      day: sql<string>`to_char(to_timestamp(${schema.visits.clickedAt} / 1000.0), 'YYYY-MM-DD')`.as('day'),
      count: count(),
    })
    .from(schema.visits)
    .where(eq(schema.visits.linkId, linkId))
    .groupBy(sql`day`)
    .orderBy(sql`day`);

  // Top países
  const topCountries = await db
    .select({ country: schema.visits.country, count: count() })
    .from(schema.visits)
    .where(eq(schema.visits.linkId, linkId))
    .groupBy(schema.visits.country)
    .orderBy(desc(count()))
    .limit(10);

  // Últimas visitas
  const recentVisits = await db
    .select()
    .from(schema.visits)
    .where(eq(schema.visits.linkId, linkId))
    .orderBy(desc(schema.visits.clickedAt))
    .limit(20);

  const baseUrl = process.env.REDIRECT_BASE_URL || 'http://localhost:3000';

  const content = `
    <div class="page-header">
      <a href="/links" class="btn btn-secondary">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Volver
      </a>
      <h2>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--indigo-400)">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        Estadísticas: /${link[0].slug}
      </h2>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${totalVisits[0].count}</div>
        <div class="stat-label">Total clics</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${visitsByDay.length}</div>
        <div class="stat-label">Días activo</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${topCountries.length}</div>
        <div class="stat-label">Países</div>
      </div>
    </div>

    <div class="detail-card">
      <h3>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        Información del link
      </h3>
      <div style="margin-bottom: 0.75rem;">
        <span style="color: var(--slate-500); font-size: 0.8125rem;">Destino:</span><br>
        <a href="${link[0].destination}" target="_blank">${link[0].destination}</a>
      </div>
      <div>
        <span style="color: var(--slate-500); font-size: 0.8125rem;">URL corta:</span><br>
        <a href="${baseUrl}/${link[0].slug}" target="_blank" class="slug-link">${baseUrl}/${link[0].slug}</a>
      </div>
    </div>

    ${visitsByDay.length > 0 ? `
    <div class="detail-card">
      <h3>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        Clics por día
      </h3>
      <div class="chart">
        ${renderBarChart(visitsByDay)}
      </div>
    </div>` : ''}

    ${topCountries.length > 0 ? `
    <div class="detail-card">
      <h3>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        Top países
      </h3>
      <table class="table">
        <thead><tr><th>País</th><th>Visitas</th></tr></thead>
        <tbody>
          ${topCountries.map(r => `<tr><td>${r.country || 'Desconocido'}</td><td>${r.count}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="detail-card">
      <h3>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        Últimas visitas
      </h3>
      <table class="table">
        <thead><tr><th>Fecha</th><th>País</th><th>Referrer</th></tr></thead>
        <tbody>
          ${recentVisits.map(v => `
            <tr>
              <td>${new Date(v.clickedAt).toLocaleString('es-ES')}</td>
              <td>${v.country || '-'}</td>
              <td class="destination" title="${v.referer || ''}">${v.referer ? truncate(v.referer, 40) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  return c.html(layout(`Stats: /${link[0].slug}`, content));
});

function renderBarChart(data: { day: string; count: number }[]) {
  const max = Math.max(...data.map(d => d.count));
  return `<div class="bar-chart">
    ${data.slice(-30).map(d => `
      <div class="bar-item" title="${d.day}: ${d.count} clics">
        <div class="bar" style="height: ${Math.round((d.count / max) * 100)}%"></div>
        <span class="bar-label">${d.day.slice(5)}</span>
      </div>
    `).join('')}
  </div>`;
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default stats;
