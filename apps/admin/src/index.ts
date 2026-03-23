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
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --slate-50: #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  --slate-300: #cbd5e1;
  --slate-400: #94a3b8;
  --slate-500: #64748b;
  --slate-600: #475569;
  --slate-700: #334155;
  --slate-800: #1e293b;
  --slate-900: #0f172a;
  --slate-950: #020617;
  
  --indigo-400: #818cf8;
  --indigo-500: #6366f1;
  --indigo-600: #4f46e5;
  --indigo-700: #4338ca;
  
  --emerald-400: #34d399;
  --emerald-500: #10b981;
  
  --rose-400: #fb7185;
  --rose-500: #f43f5e;
  --rose-600: #e11d48;
  
  --amber-400: #fbbf24;
  --amber-500: #f59e0b;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: var(--slate-950);
  color: var(--slate-200);
  min-height: 100vh;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Icons */
.icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.logo {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--indigo-400);
}

/* Navbar */
.navbar {
  background: linear-gradient(180deg, var(--slate-900) 0%, rgba(15, 23, 42, 0.95) 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--slate-800);
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-brand a {
  color: var(--slate-100);
  font-weight: 700;
  font-size: 1.25rem;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-link {
  color: var(--slate-400);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: var(--slate-100);
  background: var(--slate-800);
}

.nav-logout {
  color: var(--rose-400);
}

.nav-logout:hover {
  color: var(--rose-400);
  background: rgba(244, 63, 94, 0.1);
}

/* Container */
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* Page header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.page-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--slate-100);
  letter-spacing: -0.025em;
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, var(--indigo-500) 0%, var(--indigo-600) 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--indigo-400) 0%, var(--indigo-500) 100%);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--slate-700);
  color: var(--slate-200);
  border: 1px solid var(--slate-600);
}

.btn-secondary:hover {
  background: var(--slate-600);
  border-color: var(--slate-500);
}

.btn-danger {
  background: transparent;
  color: var(--rose-400);
  border: 1px solid transparent;
}

.btn-danger:hover {
  background: rgba(244, 63, 94, 0.1);
  border-color: rgba(244, 63, 94, 0.2);
}

.btn-icon {
  padding: 0.5rem;
  border-radius: 8px;
}

.btn-ghost {
  color: var(--slate-400);
  background: transparent;
  border: 1px solid transparent;
}

.btn-ghost:hover {
  color: var(--slate-200);
  background: var(--slate-800);
  border-color: var(--slate-700);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

/* Action buttons group */
.action-buttons {
  display: flex;
  gap: 0.25rem;
}

/* Table */
.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--slate-900);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--slate-800);
}

.table thead {
  background: linear-gradient(180deg, var(--slate-800) 0%, var(--slate-900) 100%);
}

.table th {
  padding: 1rem 1.25rem;
  text-align: left;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--slate-400);
  border-bottom: 1px solid var(--slate-700);
}

.table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--slate-800);
  font-size: 0.9375rem;
  transition: background-color 0.15s ease;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.table tbody tr:hover td {
  background: rgba(30, 41, 59, 0.5);
}

.empty {
  text-align: center;
  color: var(--slate-500);
  padding: 4rem 2rem !important;
  font-size: 0.9375rem;
}

/* Links */
.slug-link {
  color: var(--indigo-400);
  text-decoration: none;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.9375rem;
  transition: color 0.2s;
}

.slug-link:hover {
  color: var(--indigo-400);
  text-decoration: underline;
}

.link-title {
  display: block;
  color: var(--slate-500);
  font-size: 0.8125rem;
  margin-top: 0.25rem;
  font-weight: 400;
}

.destination {
  color: var(--slate-400);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.visits-count {
  font-weight: 700;
  color: var(--emerald-400);
  font-size: 1rem;
}

.date {
  color: var(--slate-500);
  font-size: 0.8125rem;
  white-space: nowrap;
}

/* Toggle switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--slate-700);
  border-radius: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slider:before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--slate-400);
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle input:checked + .slider {
  background: linear-gradient(135deg, var(--indigo-500) 0%, var(--indigo-600) 100%);
}

.toggle input:checked + .slider:before {
  transform: translateX(20px);
  background: white;
}

.toggle:hover .slider {
  background: var(--slate-600);
}

.toggle input:checked:hover + .slider {
  background: linear-gradient(135deg, var(--indigo-400) 0%, var(--indigo-500) 100%);
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal.hidden {
  display: none;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.8);
  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;
  background: linear-gradient(180deg, var(--slate-800) 0%, var(--slate-900) 100%);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--slate-700);
  z-index: 1;
  border: 1px solid var(--slate-700);
}

.modal-large {
  max-width: 600px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--slate-700);
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--slate-100);
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.modal-body {
  padding: 1.5rem;
}

.modal-content form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  color: var(--slate-300);
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--slate-950);
  border: 1px solid var(--slate-700);
  border-radius: 10px;
  color: var(--slate-100);
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.2s ease;
}

.form-group input:hover {
  border-color: var(--slate-600);
}

.form-group input:focus {
  border-color: var(--indigo-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input::placeholder {
  color: var(--slate-600);
}

.input-prefix {
  display: flex;
  align-items: center;
  background: var(--slate-950);
  border: 1px solid var(--slate-700);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.input-prefix:hover {
  border-color: var(--slate-600);
}

.input-prefix:focus-within {
  border-color: var(--indigo-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input-prefix .prefix {
  padding: 0.75rem 1rem;
  color: var(--slate-500);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  border-right: 1px solid var(--slate-700);
  font-family: 'SF Mono', Monaco, monospace;
}

.input-prefix input {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--slate-700);
}

/* History Modal Styles */
.link-info {
  background: var(--slate-950);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  border: 1px solid var(--slate-800);
}

.link-info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.link-info-item:last-child {
  margin-bottom: 0;
}

.link-info-label {
  color: var(--slate-500);
  font-size: 0.8125rem;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--slate-500);
}

.empty-state .empty-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  font-size: 0.9375rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  background: var(--slate-950);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  border: 1px solid var(--slate-800);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.history-field {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--indigo-400);
  background: rgba(99, 102, 241, 0.1);
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
}

.history-date {
  font-size: 0.8125rem;
  color: var(--slate-500);
}

.history-changes {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.75rem;
  align-items: center;
}

.history-old, .history-new {
  min-width: 0;
}

.history-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--slate-500);
  display: block;
  margin-bottom: 0.25rem;
}

.history-value {
  font-size: 0.875rem;
  color: var(--slate-300);
  font-family: 'SF Mono', Monaco, monospace;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-old .history-value {
  color: var(--rose-400);
  text-decoration: line-through;
}

.history-new .history-value {
  color: var(--emerald-400);
}

.history-arrow {
  color: var(--slate-600);
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-arrow .icon {
  width: 1rem;
  height: 1rem;
}

/* Messages */
.error {
  background: rgba(225, 29, 72, 0.1);
  border: 1px solid rgba(225, 29, 72, 0.2);
  color: var(--rose-400);
  padding: 0.875rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.success-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: var(--emerald-400);
  padding: 0.875rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.success-banner a {
  color: var(--emerald-400);
  text-decoration: underline;
}

/* Toast Notifications */
#toast-container {
  position: fixed;
  top: 80px;
  right: 1.5rem;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  transform: translateX(100%);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast.show {
  transform: translateX(0);
  opacity: 1;
}

.toast-success {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
  color: white;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.toast-error {
  background: linear-gradient(135deg, rgba(225, 29, 72, 0.95) 0%, rgba(190, 18, 60, 0.95) 100%);
  color: white;
  border: 1px solid rgba(225, 29, 72, 0.3);
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: linear-gradient(180deg, var(--slate-800) 0%, var(--slate-900) 100%);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid var(--slate-700);
}

.stat-number {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--indigo-400);
  line-height: 1;
}

.stat-label {
  color: var(--slate-500);
  font-size: 0.8125rem;
  margin-top: 0.5rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-card {
  background: linear-gradient(180deg, var(--slate-800) 0%, var(--slate-900) 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--slate-700);
}

.detail-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--slate-100);
  margin-bottom: 1rem;
}

.detail-card a {
  color: var(--indigo-400);
}

/* Bar chart */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 140px;
  overflow-x: auto;
  padding: 0.5rem 0;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 32px;
}

.bar {
  width: 24px;
  background: linear-gradient(180deg, var(--indigo-400) 0%, var(--indigo-600) 100%);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: opacity 0.2s;
}

.bar:hover {
  opacity: 0.8;
}

.bar-label {
  font-size: 0.6875rem;
  color: var(--slate-600);
  transform: rotate(-45deg);
  white-space: nowrap;
  margin-top: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .page-header h2 {
    font-size: 1.5rem;
  }
  
  .navbar {
    padding: 0 1rem;
  }
  
  .nav-brand a span {
    display: none;
  }
  
  .table {
    font-size: 0.875rem;
  }
  
  .table th,
  .table td {
    padding: 0.875rem 0.75rem;
  }
  
  .destination {
    max-width: 150px;
  }
  
  .action-buttons {
    flex-wrap: wrap;
  }
  
  .modal-content {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
  
  .history-changes {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .history-arrow {
    transform: rotate(90deg);
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.table tbody tr {
  animation: fadeIn 0.2s ease-out;
}
`;
