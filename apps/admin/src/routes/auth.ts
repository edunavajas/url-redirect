import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const auth = new Hono();

const JWT_SECRET = process.env.JWT_SECRET!;

auth.get('/login', (c) => {
  const error = c.req.query('error');
  return c.html(loginPage(error));
});

auth.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const username = body['username'] as string;
  const password = body['password'] as string;

  if (!username || !password) {
    return c.redirect('/auth/login?error=invalid');
  }

  // Read credentials fresh from env on each login attempt
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD env var not set!')
    return c.json({ error: 'Server misconfiguration' }, 500)
  }

  const validUsername = username === ADMIN_USERNAME;
  // Comparación segura
  let validPassword = false;
  if (ADMIN_PASSWORD.startsWith('$2')) {
    // bcrypt hash
    try {
      validPassword = await bcrypt.compare(password, ADMIN_PASSWORD);
    } catch (e) {
      console.error('bcrypt error:', e);
      validPassword = false;
    }
  } else if (ADMIN_PASSWORD.length === 64) {
    // SHA256 hash (temporal)
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    validPassword = hash === ADMIN_PASSWORD;
  } else {
    // Texto plano (solo para dev)
    validPassword = password === ADMIN_PASSWORD;
  }

  if (!validUsername || !validPassword) {
    // Delay para prevenir brute force
    await new Promise(r => setTimeout(r, 500));
    return c.redirect('/auth/login?error=invalid');
  }

  const token = await sign(
    { sub: username, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 7 },
    JWT_SECRET
  );

  setCookie(c, 'admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 86400 * 7,
    path: '/',
  });

  return c.redirect('/links');
});

auth.get('/logout', (c) => {
  deleteCookie(c, 'admin_token', { path: '/' });
  return c.redirect('/auth/login');
});

function loginPage(error?: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Iniciar sesión</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
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
      --rose-400: #fb7185;
      --rose-500: #f43f5e;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--slate-950);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }
    
    .card {
      background: linear-gradient(180deg, var(--slate-800) 0%, var(--slate-900) 100%);
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
      margin: 1rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--slate-700);
      border: 1px solid var(--slate-700);
    }
    
    .logo {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .logo-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
      color: var(--indigo-400);
    }
    
    .logo h1 {
      color: var(--slate-100);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    
    .logo p {
      color: var(--slate-500);
      font-size: 0.875rem;
      margin-top: 0.375rem;
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    label {
      display: block;
      color: var(--slate-300);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    
    input {
      width: 100%;
      padding: 0.875rem 1rem;
      background: var(--slate-950);
      border: 1px solid var(--slate-700);
      border-radius: 10px;
      color: var(--slate-100);
      font-size: 0.9375rem;
      outline: none;
      transition: all 0.2s ease;
    }
    
    input:hover {
      border-color: var(--slate-600);
    }
    
    input:focus {
      border-color: var(--indigo-500);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    input::placeholder {
      color: var(--slate-600);
    }
    
    .error {
      background: rgba(225, 29, 72, 0.1);
      border: 1px solid rgba(225, 29, 72, 0.2);
      color: var(--rose-400);
      padding: 0.875rem 1rem;
      border-radius: 10px;
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    button {
      width: 100%;
      padding: 0.875rem;
      background: linear-gradient(135deg, var(--indigo-500) 0%, var(--indigo-600) 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
    }
    
    button:hover {
      background: linear-gradient(135deg, var(--indigo-400) 0%, var(--indigo-500) 100%);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
      transform: translateY(-1px);
    }
    
    button:active {
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
      <h1>URL Admin</h1>
      <p>Panel de administración</p>
    </div>
    ${error ? `<div class="error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      Usuario o contraseña incorrectos
    </div>` : ''}
    <form method="POST" action="/auth/login">
      <div class="form-group">
        <label for="username">Usuario</label>
        <input type="text" id="username" name="username" autocomplete="username" required autofocus placeholder="admin">
      </div>
      <div class="form-group">
        <label for="password">Contraseña</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required placeholder="••••••••">
      </div>
      <button type="submit">Iniciar sesión</button>
    </form>
  </div>
</body>
</html>`;
}

export default auth;
