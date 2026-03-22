# URL Redirect System

Sistema de redirección de URLs con panel de administración. Construido con Bun, Hono, SQLite y Docker.

## Características

- **Redirector**: Servicio de redirección rápida con tracking de clicks y cache en memoria
- **Admin**: Panel de administración protegido con JWT para gestionar links
- **Base de datos**: SQLite compartida entre ambos servicios mediante volumen Docker
- **Despliegue**: Soporta desarrollo local con Docker Compose y producción en Coolify

## Requisitos

- [Bun](https://bun.sh) 1.1+
- Docker y Docker Compose (para despliegue)
- Servidor VPS (para producción)
- Cuenta en Cloudflare (recomendado)

## Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone <tu-repo>
cd url-redirect
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
# Base de datos
DATABASE_URL=./db/data/links.db

# Redirector
PORT=3000
IP_SALT=tu-salt-secreto-aleatorio
REDIRECT_BASE_URL=https://go.tudominio.com
ADMIN_BASE_URL=https://admin.tudominio.com

# Admin
ADMIN_PORT=3001
JWT_SECRET=tu-jwt-secret-muy-largo-y-aleatorio
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$2a$12$... # Generar con el script (ver abajo)
NODE_ENV=production
```

### 3. Generar contraseña segura

```bash
bun install
bun run scripts/generate-password.ts tu-contraseña-segura
```

Copia el hash generado en tu `.env` como `ADMIN_PASSWORD`.

### 4. Levantar con Docker Compose

```bash
docker-compose up -d
```

Los servicios estarán disponibles en:
- **Redirector**: http://localhost:3000
- **Admin**: http://localhost:3001

### 5. Crear link de prueba

```bash
bun run scripts/seed.ts
```

Prueba el redirector:
```bash
curl http://localhost:3000/test
# Debería redirigir a https://example.com
```

---

## Tutorial Cloudflare

Para proteger tu aplicación y usar tu propio dominio, sigue estos pasos:

### Agregar tu sitio a Cloudflare

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click en "Add a Site"
3. Ingresa tu dominio (ej: `tudominio.com`)
4. Selecciona el plan gratuito y continúa
5. Cloudflare te dará nameservers para configurar en tu registrador de dominio
6. Espera a que el estado cambie a "Active" (puede tomar unos minutos)

### Configurar registros DNS

Ve a **DNS > Records** y crea:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | `go` | IP de tu VPS | 🟠 Proxied | Auto |
| A | `admin` | IP de tu VPS | 🟠 Proxied | Auto |

> **Nota**: El "proxy naranja" (🟠) DEBE estar activado para que Cloudflare maneje SSL y protección.

### Configurar SSL/TLS

Ve a **SSL/TLS > Overview**:
1. Cambia el modo a **"Full (strict)"**
2. Esto asegura que la conexión esté cifrada entre Cloudflare → tu servidor

### Protección adicional para el Admin (Opcional)

#### Opción A: Regla WAF para restricción geográfica

Ve a **Security > WAF > Custom rules**:

1. Click en **Create rule**
2. Nombre: "Block Admin from other countries"
3. Expression:
   ```
   (http.host eq "admin.tudominio.com" and not ip.geoip.country in {"US" "MX" "ES"})
   ```
   (Ajusta los países según tus necesidades)
4. Action: **Block**
5. Click en **Deploy**

#### Opción B: Cloudflare Access (Zero Trust) - Más seguro

Ve a **Zero Trust > Access > Applications**:

1. Click en **Add an application**
2. Selecciona **Self-hosted**
3. Configura:
   - Application name: `URL Admin`
   - Session duration: `24 hours`
   - Application domain: `admin.tudominio.com`
4. En **Identity providers**: Selecciona **One-time PIN**
5. En **Policies**:
   - Policy name: `Allow email`
   - Action: `Allow`
   - Include: `Emails` → agrega tu email
6. Click en **Next** y luego **Add application**

Ahora el admin requerirá un código OTP enviado a tu email antes de acceder.

---

## Tutorial Coolify

[Coolify](https://coolify.io) es una alternativa a Heroku/Vercel auto-hosteada que facilita el despliegue.

### Requisitos previos

1. Un VPS con Coolify instalado (sigue [su guía oficial](https://coolify.io/docs/installation))
2. Acceso SSH al VPS
3. Tu código en un repositorio Git

### Pasos de despliegue

#### 1. Crear proyecto en Coolify

1. Accede al panel de Coolify (`https://coolify.tuservidor.com`)
2. Click en **Projects** → **Create project**
3. Nombre: `url-redirect`
4. Click en el proyecto creado

#### 2. Añadir servicio Docker Compose

1. En el proyecto, click en **+ Add resource**
2. Selecciona **Docker Compose**
3. Configuración:
   - Name: `url-redirect-stack`
   - Build pack: `dockercompose`

#### 3. Configurar el docker-compose

Pega el contenido del archivo `docker-compose.coolify.yml`:

```yaml
version: '3.9'

volumes:
  db_data:
    driver: local

services:
  redirector:
    build:
      context: .
      dockerfile: apps/redirector/Dockerfile
    container_name: url-redirector
    restart: unless-stopped
    expose:
      - "3000"
    volumes:
      - db_data:/data
    environment:
      - DATABASE_URL=/data/links.db
      - IP_SALT=${IP_SALT}
      - REDIRECT_BASE_URL=${REDIRECT_BASE_URL}
      - ADMIN_BASE_URL=${ADMIN_BASE_URL}
      - PORT=3000
    labels:
      - "coolify.managed=true"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - app-network

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    container_name: url-admin
    restart: unless-stopped
    expose:
      - "3001"
    volumes:
      - db_data:/data
    environment:
      - DATABASE_URL=/data/links.db
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - REDIRECT_BASE_URL=${REDIRECT_BASE_URL}
      - ADMIN_BASE_URL=${ADMIN_BASE_URL}
      - ADMIN_PORT=3001
      - NODE_ENV=production
    depends_on:
      redirector:
        condition: service_healthy
    labels:
      - "coolify.managed=true"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

#### 4. Configurar variables de entorno

Ve a la pestaña **Environment variables** y agrega todas las variables del `.env`:

| Variable | Valor de ejemplo | Descripción |
|----------|------------------|-------------|
| `IP_SALT` | `abc123xyz...` | Salt para hash de IPs |
| `REDIRECT_BASE_URL` | `https://go.tudominio.com` | URL base del redirector |
| `ADMIN_BASE_URL` | `https://admin.tudominio.com` | URL base del admin |
| `JWT_SECRET` | `tu-secret-jwt...` | Clave secreta para JWT |
| `ADMIN_USERNAME` | `admin` | Usuario del panel |
| `ADMIN_PASSWORD` | `$2a$12$...` | Hash de contraseña |

> **Nota**: Genera el hash de contraseña con `bun run scripts/generate-password.ts`

#### 5. Configurar dominios

Ve a la pestaña **Domains**:

1. Click en **+ Add domain**
2. Para el redirector:
   - Domain: `go.tudominio.com`
   - Container port: `3000`
   - Container: `url-redirector`
3. Click en **+ Add domain**
4. Para el admin:
   - Domain: `admin.tudominio.com`
   - Container port: `3001`
   - Container: `url-admin`

#### 6. Hacer deploy

1. Ve a la pestaña **General**
2. Click en **Deploy**
3. Coolify construirá las imágenes y levantará los contenedores
4. Revisa los logs en la pestaña **Logs** si hay problemas

#### 7. Verificar despliegue

```bash
# Test redirector
curl https://go.tudominio.com/health

# Test admin login (desde navegador)
# https://admin.tudominio.com/
```

---

## Variables de Entorno

### Redirector

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `DATABASE_URL` | Sí | Ruta a la base de datos SQLite | `/data/links.db` |
| `PORT` | Sí | Puerto del servidor | `3000` |
| `IP_SALT` | Sí | Salt para anonimizar IPs | `random-string` |
| `REDIRECT_BASE_URL` | Sí | URL base del redirector | `https://go.tudominio.com` |
| `ADMIN_BASE_URL` | Sí | URL base del admin (para CORS) | `https://admin.tudominio.com` |

### Admin

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `DATABASE_URL` | Sí | Ruta a la base de datos SQLite | `/data/links.db` |
| `ADMIN_PORT` | Sí | Puerto del servidor admin | `3001` |
| `JWT_SECRET` | Sí | Clave secreta para firmar JWT | `long-random-secret` |
| `ADMIN_USERNAME` | Sí | Usuario para login | `admin` |
| `ADMIN_PASSWORD` | Sí | Hash bcrypt de la contraseña | `$2a$12$...` |
| `REDIRECT_BASE_URL` | Sí | URL base del redirector | `https://go.tudominio.com` |
| `ADMIN_BASE_URL` | Sí | URL base del admin | `https://admin.tudominio.com` |
| `NODE_ENV` | No | Entorno de ejecución | `production` |

---

## Backup de la Base de Datos

### Backup manual

```bash
# Copiar desde el contenedor a tu máquina
docker cp url-redirector:/data/links.db ./backup-$(date +%Y%m%d).db
```

### Restaurar backup

```bash
# Detener contenedores
docker-compose down

# Copiar backup al volumen
docker run --rm -v url-redirect_db_data:/data -v $(pwd):/backup alpine cp /backup/links.db /data/

# O si usas Docker directamente:
docker cp ./backup-20240101.db url-redirector:/data/links.db

# Levantar contenedores
docker-compose up -d
```

### Backup automático (ejemplo con cron)

En tu VPS, agrega al crontab:

```bash
# Backup diario a las 3 AM
0 3 * * * docker cp url-redirector:/data/links.db /backups/links-$(date +\%Y\%m\%d).db && find /backups -name "links-*.db" -mtime +7 -delete
```

---

## Desarrollo Local (sin Docker)

Si prefieres desarrollar sin Docker:

```bash
# Instalar dependencias
bun install

# Configurar .env
# Ajusta DATABASE_URL a una ruta local como ./db/data/links.db

# Ejecutar migraciones
bun run --cwd packages/db migrate

# Iniciar redirector (terminal 1)
bun run --cwd apps/redirector dev

# Iniciar admin (terminal 2)
bun run --cwd apps/admin dev
```

---

## Estructura del Proyecto

```
url-redirect/
├── apps/
│   ├── redirector/          # Servicio de redirección
│   │   ├── src/
│   │   │   ├── index.ts     # Servidor Hono
│   │   │   └── cache.ts     # Cache en memoria
│   │   ├── Dockerfile       # Dockerfile del redirector
│   │   └── package.json
│   └── admin/               # Panel de administración
│       ├── src/
│       │   └── index.ts     # Servidor Hono + JWT
│       ├── Dockerfile       # Dockerfile del admin
│       └── package.json
├── packages/
│   └── db/                  # Package compartido
│       ├── src/
│       │   ├── client.ts    # Conexión SQLite
│       │   ├── schema.ts    # Schema Drizzle
│       │   └── index.ts     # Exports
│       └── drizzle/         # Migraciones
├── scripts/
│   ├── generate-password.ts # Generar hash de contraseña
│   └── seed.ts              # Crear datos de prueba
├── db/data/                 # Datos SQLite (montado como volumen)
├── docker-compose.yml       # Desarrollo local
├── docker-compose.coolify.yml  # Producción en Coolify
└── README.md
```

---

## Troubleshooting

### Error: "better-sqlite3" no encuentra la base de datos

Asegúrate de que el directorio `/data` existe en el contenedor y tiene permisos correctos. Los Dockerfiles incluyen `mkdir -p /data` y cambian permisos al usuario `appuser`.

### Los contenedores no pueden compartir la base de datos

Verifica que ambos servicios usen el mismo volumen:
```yaml
volumes:
  - db_data:/data  # Mismo volumen para ambos
```

### Error de CORS en el admin

Asegúrate de que `REDIRECT_BASE_URL` y `ADMIN_BASE_URL` estén configuradas correctamente y coincidan con las URLs que usas.

### El redirector no redirige

Verifica que:
1. El link existe en la base de datos
2. El redirector está accediendo a la misma base de datos que el admin
3. Las migraciones se ejecutaron correctamente

### Problemas con healthcheck en Coolify

Si Coolify reporta el servicio como "unhealthy", verifica:
1. Que el contenedor tenga `wget` instalado (los Dockerfiles lo incluyen vía `apk`)
2. Que la ruta del healthcheck sea correcta (`/health` para redirector, `/` para admin)
3. Los logs del contenedor para ver el error específico

---

## Licencia

MIT

## Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que deseas hacer.
