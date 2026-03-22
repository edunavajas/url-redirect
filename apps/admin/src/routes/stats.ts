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
      day: sql<string>`date(datetime(${schema.visits.clickedAt} / 1000, 'unixepoch'))`.as('day'),
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
      <a href="/links" class="btn btn-secondary">← Volver</a>
      <h2>📊 Estadísticas: /${link[0].slug}</h2>
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
      <h3>Destino</h3>
      <a href="${link[0].destination}" target="_blank">${link[0].destination}</a>
      <br><br>
      <strong>URL corta:</strong> <a href="${baseUrl}/${link[0].slug}" target="_blank">${baseUrl}/${link[0].slug}</a>
    </div>

    ${visitsByDay.length > 0 ? `
    <div class="detail-card">
      <h3>Clics por día</h3>
      <div class="chart">
        ${renderBarChart(visitsByDay)}
      </div>
    </div>` : ''}

    ${topCountries.length > 0 ? `
    <div class="detail-card">
      <h3>Top países</h3>
      <table class="table">
        <thead><tr><th>País</th><th>Visitas</th></tr></thead>
        <tbody>
          ${topCountries.map(r => `<tr><td>${r.country || 'Desconocido'}</td><td>${r.count}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="detail-card">
      <h3>Últimas visitas</h3>
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
