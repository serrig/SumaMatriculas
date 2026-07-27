# 🧮 SumaMatrículas

### Un juego educativo de sumas... y el viaje de un estudiante eterno por el mundo de los agentes IA

---

## 🎯 ¿Qué es esto?

**SumaMatrículas** es un juego educativo para niños donde se practican sumas a partir de números de matrícula (4 dígitos). El juego adapta la dificultad según la edad: nivel 1 para menores de 8 años (sumas de dígitos individuales) y nivel 2 para mayores (sumas de números de dos cifras).

Pero este proyecto es mucho más que un juego.

---

## 🤖 El verdadero proyecto: aprender haciendo con IA

Este repositorio nace desde una premisa sencilla: **no hay mejor forma de entender una tecnología que usarla para construir algo real.**

SumaMatrículas ha sido desarrollado casi en su totalidad conversando con agentes de IA (Claude Code, en concreto), explorando los límites, las posibilidades y las peculiaridades de trabajar codo a codo con asistentes inteligentes. Cada línea de código, cada decisión arquitectónica, cada bug resuelto ha sido una lección.

### ¿Qué he aprendido por el camino?

- 🏗️ **Arquitectura con agentes** — cómo dividir un problema en conversaciones, cuándo pedir un plan y cuándo dejar que la IA ejecute directamente
- 🔐 **Autenticación sin Supabase** — migrar de Supabase Auth a un backend propio con Passport.js + sesiones en PostgreSQL, entendiendo cada pieza del puzzle OAuth
- 🐳 **Infraestructura local** — Docker Compose para PostgreSQL, SSR con Angular 21, Express con sesiones persistentes
- 🔧 **MCP y herramientas** — configuración de Model Context Protocol para que la IA pueda interactuar con la base de datos, el sistema de archivos y más
- 🧠 **Prompting y orquestación** — cómo redactar instrucciones para que un agente explore, planifique y ejecute tareas complejas de forma autónoma… sin desviarse por el camino
- 📚 **El arte de deshacer** — porque no siempre aciertas a la primera, y está bien

Y sobre todo: **la importancia de entender lo que la IA genera**. No se trata de aceptar código ciegamente, sino de usarlo como trampolín para aprender más rápido.

---

## 🏗️ Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 (standalone components, SSR) |
| Backend | Express 5 + Passport.js |
| Base de datos | PostgreSQL 17 (Docker) |
| Autenticación | Google OAuth + email/password (bcrypt) |
| Sesiones | express-session con store en PostgreSQL |
| IA | Claude Code (agentes, skills, MCP) |
| Contenedores | Docker Compose |

---

## 🚀 Cómo arrancar

### Prerequisitos

- Node.js 22+
- Docker Desktop (para PostgreSQL)
- npm

### 1. Base de datos

```bash
cp .env.example .env       # luego rellena los secretos en .env
docker compose up -d
```

Esto levanta PostgreSQL 17 en `127.0.0.1:5433` con las credenciales de tu `.env` local.

### 2. Configurar credenciales

Edita `.env` (gitignored) con tus valores reales. Para secretos fuertes:

```bash
openssl rand -hex 32
```

Para Google OAuth necesitas crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/apis/credentials) con:

- Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`

### 3. Activar el hook de secretos (opcional pero recomendado)

```bash
brew install gitleaks        # o descarga desde github.com/gitleaks/gitleaks
git config core.hooksPath .githooks
```

Esto escanea cada commit con [gitleaks](https://github.com/gitleaks/gitleaks) y bloquea si detecta secretos.

### 4. Arrancar la app

```bash
npm start
```

La app estará disponible en `http://localhost:4000`.

### Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca en modo dev (SSR + hot reload) en :4000 |
| `npm run build` | Compila para producción |
| `npm run serve:ssr:suma-matriculas` | Sirve la build de producción en :4000 |

---

## 🔐 Gestión de secretos

**Regla de oro:** ningún secreto real se commitea al repo. El servidor falla al arrancar si detecta placeholders del repo o variables faltantes.

### Flujo

```
.env.example    →  trackeado, placeholders
.env            →  gitignored, valores reales del entorno
.githooks/      →  pre-commit con gitleaks
```

### Generar secretos fuertes

```bash
openssl rand -hex 32          # para SESSION_SECRET y POSTGRES_PASSWORD
```

### Validación al arrancar

`src/server.ts` valida al inicio que:

- `SESSION_SECRET` existe y no es ninguno de los placeholders conocidos del repo.
- `POSTGRES_USER` y `POSTGRES_PASSWORD` existen.
- `POSTGRES_PASSWORD` no es la contraseña por defecto `postgres`.

Si algo falla, el proceso muere con un mensaje claro antes de abrir el puerto.

### Pre-commit hook (gitleaks)

Cada commit se escanea con [gitleaks](https://github.com/gitleaks/gitleaks). Si detecta API keys, tokens o passwords en los archivos staged, el commit se bloquea. Si gitleaks no está instalado, el hook avisa pero deja pasar (para no romper nuevos clones).

### Despliegue detrás de Cloudflare Tunnel (resumen)

Variables de entorno adicionales recomendadas:

```
APP_URL=https://tu-dominio.example.com
NG_ALLOWED_HOSTS=tu-dominio.example.com
COOKIE_SECURE=true              # obligatorio con HTTPS
```

Y en `src/server.ts`, antes del middleware de sesión, añadir:

```ts
app.set('trust proxy', 1);      // confiar en X-Forwarded-Proto de Cloudflare
```

### Auditoría

```bash
npm audit                       # vulnerabilidades en dependencias
```

## 🗺️ Roadmap personal

Esto no es un producto terminado. Es un cuaderno de laboratorio. Lo que viene:

- [ ] Más tipos de operaciones (restas, multiplicaciones)
- [ ] Panel de administración para ver progreso de varios niños
- [ ] Gamificación: logros, rachas, recompensas
- [ ] Perfiles multi-jugador para hermanos
- [ ] Despliegue en producción (¿ Railway? ¿ Fly.io?)
- [ ] Seguir explorando hasta dónde llega esto de los agentes

---

## 🧙 Del desarrollador

> *"Soy un entusiasta de la tecnología, un estudiante eterno. No construyo esto porque necesite un juego de sumas — lo construyo porque quiero entender cómo funcionan los engranajes. Cada proyecto es una excusa para aprender algo nuevo, y este ha sido un viaje fascinante por el mundo de la IA aplicada al desarrollo de software."*

Si has llegado hasta aquí, te invito a que hagas lo mismo: **elige algo que te dé curiosidad, construye algo con IA, equivócate, aprende, repite.** No hay mejor inversión que el tiempo que dedicas a entender cómo funcionan las herramientas que usas.

---

## 📦 Estructura del proyecto

```
├── docker-compose.yml      # PostgreSQL local
├── src/
│   ├── server.ts            # Backend Express + Passport + SSR
│   └── app/
│       ├── game.service.ts  # Lógica del juego y comunicación con API
│       ├── auth.component.ts     # Login/registro
│       ├── age-profile.component.ts  # Configuración de edad
│       ├── profile.component.ts  # Estadísticas y progreso
│       ├── app.ts / app.html     # Componente raíz
│       └── ...
├── .env.example             # Variables de entorno de ejemplo
├── set-env.js               # Genera environment.ts
└── CLAUDE.md                # Instrucciones para agentes IA
```

---

## ⚖️ Licencia

MIT — haz con esto lo que quieras, pero si aprendes algo nuevo, considérame un compañero de viaje, no un profesor.
