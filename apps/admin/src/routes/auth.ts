import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';

const auth = new Hono();

const JWT_SECRET = process.env.JWT_SECRET!;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

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

  const validUsername = username === ADMIN_USERNAME;
  // Comparación segura con bcrypt (ADMIN_PASSWORD puede ser hash o texto plano en dev)
  let validPassword = false;
  if (ADMIN_PASSWORD.startsWith('$2')) {
    validPassword = await bcrypt.compare(password, ADMIN_PASSWORD);
  } else {
    // Dev mode: comparación directa (avisar en producción)
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #1e293b; border-radius: 12px; padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
    .logo { text-align: center; margin-bottom: 2rem; }
    .logo h1 { color: #f1f5f9; font-size: 1.5rem; font-weight: 700; }
    .logo p { color: #64748b; font-size: 0.875rem; margin-top: 0.25rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; color: #94a3b8; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
    input { width: 100%; padding: 0.75rem 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f1f5f9; font-size: 1rem; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: #6366f1; }
    .error { background: #450a0a; border: 1px solid #7f1d1d; color: #fca5a5; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1.25rem; }
    button { width: 100%; padding: 0.875rem; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <h1>🔗 URL Admin</h1>
      <p>Panel de administración</p>
    </div>
    ${error ? '<div class="error">⚠️ Usuario o contraseña incorrectos</div>' : ''}
    <form method="POST" action="/auth/login">
      <div class="form-group">
        <label for="username">Usuario</label>
        <input type="text" id="username" name="username" autocomplete="username" required autofocus>
      </div>
      <div class="form-group">
        <label for="password">Contraseña</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <button type="submit">Iniciar sesión</button>
    </form>
  </div>
</body>
</html>`;
}

export default auth;
