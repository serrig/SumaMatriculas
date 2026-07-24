import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pg from 'pg';
import pgSession from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { join } from 'node:path';
import 'dotenv/config';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// ── PostgreSQL connection pool ────────────────────────────────────────
const dbUser = process.env['POSTGRES_USER'] || 'postgres';
const dbPassword = process.env['POSTGRES_PASSWORD'] || 'postgres';
const dbHost = process.env['POSTGRES_HOST'] || 'localhost';
const dbPort = process.env['POSTGRES_PORT'] || '5433';
const dbName = process.env['POSTGRES_DB'] || 'postgres';

const pool = new pg.Pool({
  user: dbUser,
  password: dbPassword,
  host: dbHost,
  port: parseInt(dbPort, 10),
  database: dbName,
});

// ── Middleware ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store in PostgreSQL
const PgStore = pgSession(session);
app.use(
  session({
    store: new PgStore({
      pool,
      tableName: 'session',
      createTableIfMissing: false,
    }),
    secret: process.env['SESSION_SECRET'] || 'sumamatriculas_dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      // COOKIE_SECURE only when serving over HTTPS (never tie to NODE_ENV:
      // local Docker runs NODE_ENV=production over plain HTTP, and
      // express-session refuses to send Secure cookies without TLS).
      secure: process.env['COOKIE_SECURE'] === 'true',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ── Passport serialization ────────────────────────────────────────────
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, total_points, age, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(new Error('Usuario no encontrado'));
    }
  } catch (err) {
    done(err);
  }
});

// ── Google OAuth Strategy ─────────────────────────────────────────────
if (process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']) {
  const appUrl = process.env['APP_URL'] || 'http://localhost:4000';
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env['GOOGLE_CLIENT_ID'],
        clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
        callbackURL: `${appUrl}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const googleId = profile.id;

        if (!email) {
          return done(new Error('No se pudo obtener el email del perfil de Google'));
        }

        try {
          // 1. Buscar por google_id
          let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
          if (result.rows.length > 0) {
            return done(null, result.rows[0]);
          }

          // 2. Buscar por email y vincular google_id
          result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
          if (result.rows.length > 0) {
            const user = result.rows[0];
            await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
            user.google_id = googleId;
            return done(null, user);
          }

          // 3. Crear nuevo usuario
          const insertResult = await pool.query(
            'INSERT INTO users (email, google_id, username) VALUES ($1, $2, $3) RETURNING *',
            [email.toLowerCase(), googleId, 'Jugador']
          );
          done(null, insertResult.rows[0]);
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

// ── Auth middleware ────────────────────────────────────────────────────
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (req.isAuthenticated()) { next(); return; }
  res.status(401).json({ error: 'No autorizado' });
}

// ═══════════════════════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════════════════════

// ── Auth routes ───────────────────────────────────────────────────────

// Obtener sesión activa
app.get('/api/auth/session', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

// Registro local
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING id, email, username, total_points, age',
      [email.toLowerCase(), hash, 'Jugador']
    );

    const user = result.rows[0];
    return req.login(user, (err) => {
      if (err) { res.status(500).json({ error: 'Error al iniciar sesión tras registrarse' }); return; }
      res.json({ success: true, user });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error en el registro de usuario' });
  }
});

// Login local
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const user = result.rows[0];
    if (!user.password_hash) {
      return res
        .status(400)
        .json({ error: 'Esta cuenta solo tiene configurado inicio con Google' });
    }
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    return req.login(user, (err) => {
      if (err) { res.status(500).json({ error: 'Error al iniciar sesión' }); return; }
      res.json({
        success: true,
        user: { id: user.id, email: user.email, username: user.username, total_points: user.total_points, age: user.age },
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error en el inicio de sesión' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) { res.status(500).json({ error: 'Error al cerrar sesión' }); return; }
    res.json({ success: true });
  });
});

// Google OAuth
app.get('/api/auth/google', (req, res, next) => {
  if (!process.env['GOOGLE_CLIENT_ID'] || !process.env['GOOGLE_CLIENT_SECRET']) {
    return res.status(501).json({ error: 'Google OAuth no está configurado en este servidor.' });
  }
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/api/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/?loginError=google',
  })(req, res, next);
});

// ── Profile routes (protegidas) ───────────────────────────────────────

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const result = await pool.query(
      'SELECT id, email, username, total_points, age, created_at FROM users WHERE id = $1',
      [user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

app.post('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { age, username } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (age !== undefined) {
      updates.push(`age = $${paramIndex++}`);
      values.push(age);
    }
    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(user.id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, username, total_points, age`,
      values
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// Actualizar puntos
app.put('/api/profile/points', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { total_points } = req.body;
    if (total_points === undefined) {
      return res.status(400).json({ error: 'total_points requerido' });
    }
    const result = await pool.query(
      'UPDATE users SET total_points = $1 WHERE id = $2 RETURNING total_points',
      [total_points, user.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar puntos' });
  }
});

// ── Operations routes (protegidas) ────────────────────────────────────

app.post('/api/operations', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { target_number, time_taken_ms } = req.body;
    if (!target_number || time_taken_ms === undefined) {
      return res.status(400).json({ error: 'target_number y time_taken_ms requeridos' });
    }
    const result = await pool.query(
      'INSERT INTO operations_log (user_id, target_number, time_taken_ms) VALUES ($1, $2, $3) RETURNING *',
      [user.id, target_number, time_taken_ms]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar operación' });
  }
});

app.get('/api/operations', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const result = await pool.query(
      'SELECT created_at, time_taken_ms FROM operations_log WHERE user_id = $1 ORDER BY created_at ASC',
      [user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Angular SSR (catch-all for non-API routes)
// ═══════════════════════════════════════════════════════════════════════

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

// ── Start server ──────────────────────────────────────────────────────
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`SumaMatriculas server running on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
