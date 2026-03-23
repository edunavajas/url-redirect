import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { runMigrations } from '@url-redirect/db';
import authRoutes from './routes/auth';
import linksRoutes from './routes/links';
import statsRoutes from './routes/stats';

const app = new Hono();

await runMigrations();

const JWT_SECRET = process.env.JWT_SECRET!;

// Static assets (CSS inline, no build step)
app.get('/static/style.css', (c) => {
  c.header('Content-Type', 'text/css');
  return c.body(CSS);
});

// Auth routes (públicas)
app.route('/auth', authRoutes);

// Middleware JWT para rutas protegidas
const jwtMiddleware = jwt({ secret: JWT_SECRET, cookie: 'admin_token', alg: 'HS256' });

// Protected routes
app.use('/api/*', jwtMiddleware);
app.use('/links/*', jwtMiddleware);
app.use('/stats/*', jwtMiddleware);
app.use('/dashboard*', jwtMiddleware);

app.route('/api/links', linksRoutes);
app.route('/stats', statsRoutes);

// Dashboard principal
app.get('/dashboard', jwtMiddleware, async (c) => {
  // Redirige al listado de links
  return c.redirect('/links');
});

app.route('/links', linksRoutes);

// Root → login o dashboard
app.get('/', (c) => {
  const token = getCookie(c, 'admin_token');
  if (token) return c.redirect('/links');
  return c.redirect('/auth/login');
});

const port = parseInt(process.env.ADMIN_PORT || '3001');
console.log(`🔐 Admin panel running on port ${port}`);

export default { port, fetch: app.fetch };

const CSS = `/* Reset & Base */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }

/* Navbar */
.navbar { background: #1e293b; border-bottom: 1px solid #334155; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 60px; }
.nav-brand a { color: #f1f5f9; font-weight: 700; font-size: 1.125rem; text-decoration: none; }
.nav-links { display: flex; align-items: center; gap: 1.5rem; }
.nav-link { color: #94a3b8; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
.nav-link:hover { color: #f1f5f9; }
.nav-logout { color: #ef4444; }

/* Container */
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }

/* Page header */
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; }
.page-header h2 { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; }

/* Buttons */
.btn { padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem; transition: all 0.2s; }
.btn-primary { background: #6366f1; color: white; }
.btn-primary:hover { background: #4f46e5; }
.btn-secondary { background: #334155; color: #e2e8f0; }
.btn-secondary:hover { background: #475569; }
.btn-danger { background: transparent; color: #ef4444; }
.btn-danger:hover { background: #450a0a; }
.btn-icon { padding: 0.375rem 0.5rem; }

/* Table */
.table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 10px; overflow: hidden; }
.table th { padding: 0.875rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #334155; }
.table td { padding: 0.875rem 1rem; border-bottom: 1px solid #1e293b; font-size: 0.875rem; }
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: #243044; }
.empty { text-align: center; color: #475569; padding: 3rem !important; }

/* Links */
.slug-link { color: #818cf8; text-decoration: none; font-weight: 600; font-family: monospace; }
.slug-link:hover { color: #a5b4fc; }
.link-title { display: block; color: #64748b; font-size: 0.8rem; margin-top: 0.2rem; }
.destination { color: #94a3b8; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.visits-count { font-weight: 700; color: #34d399; }
.date { color: #64748b; font-size: 0.8rem; }

/* Toggle switch */
.toggle { position: relative; display: inline-block; width: 40px; height: 22px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #334155; border-radius: 22px; transition: 0.3s; }
.slider:before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: #94a3b8; border-radius: 50%; transition: 0.3s; }
.toggle input:checked + .slider { background: #6366f1; }
.toggle input:checked + .slider:before { transform: translateX(18px); background: white; }

/* Modal */
.modal { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal.hidden { display: none; }
.modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.7); }
.modal-content { position: relative; background: #1e293b; border-radius: 12px; padding: 2rem; width: 100%; max-width: 480px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); z-index: 1; }
.modal-content h3 { font-size: 1.25rem; font-weight: 700; color: #f1f5f9; margin-bottom: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; color: #94a3b8; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; }
.form-group input { width: 100%; padding: 0.625rem 0.875rem; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
.form-group input:focus { border-color: #6366f1; }
.input-prefix { display: flex; align-items: center; background: #0f172a; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
.input-prefix .prefix { padding: 0.625rem 0.75rem; color: #475569; font-size: 0.8rem; white-space: nowrap; border-right: 1px solid #334155; }
.input-prefix input { border: none; border-radius: 0; background: transparent; }
.form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
.error { background: #450a0a; border: 1px solid #7f1d1d; color: #fca5a5; padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { background: #1e293b; border-radius: 10px; padding: 1.5rem; text-align: center; }
.stat-number { font-size: 2rem; font-weight: 800; color: #818cf8; }
.stat-label { color: #64748b; font-size: 0.8rem; margin-top: 0.25rem; }
.detail-card { background: #1e293b; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; }
.detail-card h3 { font-size: 1rem; font-weight: 700; color: #f1f5f9; margin-bottom: 1rem; }
.detail-card a { color: #818cf8; }

/* Bar chart */
.bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; overflow-x: auto; padding: 0.5rem 0; }
.bar-item { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 28px; }
.bar { width: 20px; background: #6366f1; border-radius: 3px 3px 0 0; min-height: 4px; }
.bar-label { font-size: 0.65rem; color: #475569; transform: rotate(-45deg); white-space: nowrap; }
`;
