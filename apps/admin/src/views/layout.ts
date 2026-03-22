export function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — URL Admin</title>
  <script src="https://unpkg.com/htmx.org@1.9.12"></script>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  <nav class="navbar">
    <div class="nav-brand">
      <a href="/links">🔗 URL Admin</a>
    </div>
    <div class="nav-links">
      <a href="/links" class="nav-link">Links</a>
      <a href="/auth/logout" class="nav-link nav-logout">Salir</a>
    </div>
  </nav>
  <main class="container">
    ${content}
  </main>
</body>
</html>`;
}
