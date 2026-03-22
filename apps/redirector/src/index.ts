import { Hono } from 'hono';
import { db, schema } from '@url-redirect/db';
import { runMigrations } from '@url-redirect/db';
import { getCached, setCache } from './cache';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const app = new Hono();

// Ejecutar migraciones al iniciar
runMigrations();

// Health check
app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }));

// Redirect principal
app.get('/:slug', async (c) => {
  const rawSlug = c.req.param('slug');
  const slug = rawSlug.startsWith('/') ? rawSlug.slice(1) : rawSlug;

  console.log(`[redirect] Raw param: "${rawSlug}" → Normalized: "${slug}"`)

  // 1. Buscar en caché primero
  let link = getCached(slug);

  // 2. Si no está en caché, buscar en DB
  if (!link) {
    const result = await db
      .select()
      .from(schema.links)
      .where(eq(schema.links.slug, slug))
      .limit(1);

    console.log(`[redirect] Looking up slug: "${slug}"`)
    console.log(`[redirect] Result:`, result.length ? `found → ${result[0].destination}` : 'not found')

    if (!result.length) {
      return c.html(`
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><title>Enlace no encontrado</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;}
        .box{text-align:center;padding:2rem;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
        h1{color:#e74c3c;}a{color:#3498db;}</style>
        </head>
        <body><div class="box"><h1>404</h1><p>Este enlace no existe o ha expirado.</p></div></body>
        </html>
      `, 404);
    }

    link = result[0];
    setCache(slug, link);
  }

  // 3. Verificar si está activo
  if (!link.isActive) {
    return c.html(`<!DOCTYPE html><html><body><h1>Enlace desactivado</h1></body></html>`, 410);
  }

  // 4. Verificar expiración
  if (link.expiresAt && link.expiresAt < new Date()) {
    return c.html(`<!DOCTYPE html><html><body><h1>Enlace expirado</h1></body></html>`, 410);
  }

  // 5. Registrar visita de forma asíncrona (no bloquea el redirect)
  const ip = c.req.header('cf-connecting-ip') || 
             c.req.header('x-forwarded-for')?.split(',')[0] || 
             'unknown';
  const ipHash = crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex').slice(0, 16);
  const userAgent = c.req.header('user-agent') || null;
  const referer = c.req.header('referer') || null;
  const country = c.req.header('cf-ipcountry') || null;

  // Fire-and-forget
  db.insert(schema.visits).values({
    linkId: link.id,
    ipHash,
    userAgent,
    referer,
    country,
  }).run().catch(() => {});

  // 6. Verificar max_clicks (si está configurado)
  if (link.maxClicks) {
    const countResult = db
      .select({ count: schema.visits.id })
      .from(schema.visits)
      .where(eq(schema.visits.linkId, link.id))
      .all();
    // Si superó el límite, desactivar
    // (simplificado, en producción usar COUNT(*))
  }

  // 7. Redirigir
  return c.redirect(link.destination, 301);
});

// Root redirect
app.get('/', (c) => {
  const baseUrl = process.env.ADMIN_BASE_URL || 'https://admin.example.com';
  return c.redirect(baseUrl, 302);
});

const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 Redirector running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
