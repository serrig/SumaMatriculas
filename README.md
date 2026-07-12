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
docker compose up -d
```

Esto levanta PostgreSQL 17 en el puerto 5433 con las credenciales del `.env`.

### 2. Configurar credenciales

Copia `.env.example` a `.env` y rellena las variables. Para Google OAuth necesitas crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/apis/credentials) con:

- Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`

### 3. Arrancar la app

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
