/**
 * Integration tests for the Express API in src/server.ts.
 *
 * The `pg` module is mocked with an in-memory implementation of every SQL
 * statement used by the server (users, operations_log and the connect-pg-simple
 * session store), so routes are exercised end-to-end through supertest,
 * including cookie sessions and passport authentication.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';

// The SSR engine needs the build manifest, which does not exist in tests.
// API tests don't render Angular pages, so the SSR layer is stubbed out.
vi.mock('@angular/ssr/node', () => {
  class AngularNodeAppEngine {
    handle = async () => null;
  }
  return {
    AngularNodeAppEngine,
    createNodeRequestHandler: (handler: unknown) => handler,
    isMainModule: () => false,
    writeResponseToNodeResponse: async () => {},
  };
});

// ── In-memory database ──────────────────────────────────────────────────

interface DbUser {
  id: number;
  email: string;
  username: string;
  password_hash?: string;
  google_id?: string;
  total_points: number;
  age: number | null;
  created_at: string;
}

const db = vi.hoisted(() => ({
  users: [] as Array<{
    id: number;
    email: string;
    username: string;
    password_hash?: string;
    google_id?: string;
    total_points: number;
    age: number | null;
    created_at: string;
  }>,
  operations: [] as Array<{
    id: number;
    user_id: number;
    target_number: string;
    time_taken_ms: number;
    created_at: string;
  }>,
  sessions: new Map<string, { sess: unknown; expire: number }>(),
  nextUserId: 1,
  nextOpId: 1,
  /** When set, queries whose SQL contains this substring throw. */
  failOn: null as string | null,
  /** Number of matching queries to let through before failing. */
  failSkip: 0,
}));

vi.mock('pg', () => {
  const pick = (obj: Record<string, unknown>, cols: string[]) =>
    Object.fromEntries(cols.map((c) => [c, obj[c]]));

  async function handleQuery(text: string, params: unknown[] = []) {
    const sql = text.replace(/\s+/g, ' ').trim();

    if (db.failOn && sql.includes(db.failOn)) {
      if (db.failSkip > 0) {
        db.failSkip--;
      } else {
        throw new Error(`Simulated database failure on: ${db.failOn}`);
      }
    }

    // ── Session store (connect-pg-simple) ──
    if (sql.startsWith('SELECT to_regclass')) {
      return { rows: [{ to_regclass: 'session' }], rowCount: 1 };
    }
    if (sql.startsWith('SELECT sess FROM')) {
      const [sid, nowTs] = params as [string, number];
      const row = db.sessions.get(sid);
      const valid = row && row.expire >= nowTs;
      return { rows: valid ? [{ sess: row.sess }] : [], rowCount: valid ? 1 : 0 };
    }
    if (sql.startsWith('INSERT INTO "session"')) {
      const [sess, expire, sid] = params as [unknown, number, string];
      db.sessions.set(sid, { sess, expire });
      return { rows: [{ sid }], rowCount: 1 };
    }
    if (sql.startsWith('DELETE FROM "session" WHERE sid')) {
      db.sessions.delete(params[0] as string);
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith('DELETE FROM "session" WHERE expire')) {
      const nowTs = params[0] as number;
      for (const [sid, row] of db.sessions) {
        if (row.expire < nowTs) db.sessions.delete(sid);
      }
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith('UPDATE "session" SET expire')) {
      const [expire, sid] = params as [number, string];
      const row = db.sessions.get(sid);
      if (row) row.expire = expire;
      return { rows: row ? [{ sid }] : [], rowCount: row ? 1 : 0 };
    }

    // ── Users ──
    if (sql.startsWith('SELECT id FROM users WHERE email')) {
      const rows = db.users.filter((u) => u.email === params[0]).map((u) => ({ id: u.id }));
      return { rows, rowCount: rows.length };
    }
    if (sql.startsWith('SELECT * FROM users WHERE email')) {
      const rows = db.users.filter((u) => u.email === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (sql.startsWith('SELECT * FROM users WHERE google_id')) {
      const rows = db.users.filter((u) => u.google_id === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (sql.startsWith('SELECT id, email, username, total_points, age, created_at FROM users WHERE id')) {
      const cols = ['id', 'email', 'username', 'total_points', 'age', 'created_at'];
      const rows = db.users.filter((u) => u.id === params[0]).map((u) => pick(u as never, cols));
      return { rows, rowCount: rows.length };
    }
    if (sql.startsWith('INSERT INTO users')) {
      const user: (typeof db.users)[number] = {
        id: db.nextUserId++,
        email: params[0] as string,
        username: (params[2] as string) ?? 'Jugador',
        total_points: 0,
        age: null,
        created_at: '2026-07-01T00:00:00.000Z',
      };
      if (sql.includes('password_hash')) user.password_hash = params[1] as string;
      if (sql.includes('google_id')) user.google_id = params[1] as string;
      db.users.push(user);
      return {
        rows: [pick(user as never, ['id', 'email', 'username', 'total_points', 'age'])],
        rowCount: 1,
      };
    }
    if (sql.startsWith('UPDATE users SET')) {
      const match = sql.match(/^UPDATE users SET (.+) WHERE id = \$(\d+) RETURNING (.+)$/);
      if (!match) throw new Error(`Unsupported UPDATE in pg mock: ${sql}`);
      const [, assignments, idParamIndex, returning] = match;
      const user = db.users.find((u) => u.id === params[Number(idParamIndex) - 1]);
      if (!user) return { rows: [], rowCount: 0 };
      for (const assignment of assignments.split(', ')) {
        const [column, ref] = assignment.split(' = ');
        (user as never)[column] = params[Number(ref.slice(1)) - 1];
      }
      return { rows: [pick(user as never, returning.split(', '))], rowCount: 1 };
    }

    // ── Operations log ──
    if (sql.startsWith('INSERT INTO operations_log')) {
      const operation = {
        id: db.nextOpId,
        user_id: params[0] as number,
        target_number: params[1] as string,
        time_taken_ms: params[2] as number,
        created_at: `2026-07-23T10:00:0${db.nextOpId}.000Z`,
      };
      db.nextOpId++;
      db.operations.push(operation);
      return { rows: [operation], rowCount: 1 };
    }
    if (sql.startsWith('SELECT created_at, time_taken_ms FROM operations_log WHERE user_id')) {
      const rows = db.operations
        .filter((o) => o.user_id === params[0])
        .map((o) => pick(o as never, ['created_at', 'time_taken_ms']));
      return { rows, rowCount: rows.length };
    }

    throw new Error(`Unmocked SQL in pg mock: ${sql}`);
  }

  class Pool {
    query = (text: string, params?: unknown[]) => handleQuery(text, params);
    connect = async () => ({ query: this.query, release: () => {} });
    on = () => this;
    end = async () => {};
  }
  return { default: { Pool }, Pool };
});

// ── App under test ──────────────────────────────────────────────────────

let app: unknown;

beforeAll(async () => {
  // Force the "Google OAuth not configured" branch deterministically.
  // dotenv does not override variables that are already set.
  process.env['GOOGLE_CLIENT_ID'] = '';
  process.env['GOOGLE_CLIENT_SECRET'] = '';
  ({ reqHandler: app } = await import('./server'));
});

beforeEach(() => {
  db.users = [];
  db.operations = [];
  db.sessions.clear();
  db.nextUserId = 1;
  db.nextOpId = 1;
  db.failOn = null;
  db.failSkip = 0;
});

function agent() {
  return supertest.agent(app as never);
}

function seedUser(overrides: Partial<DbUser> = {}): DbUser {
  const user: DbUser = {
    id: db.nextUserId++,
    email: 'seed@test.com',
    username: 'Jugador',
    total_points: 0,
    age: null,
    created_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
  db.users.push(user);
  return user;
}

async function registerAndLogin(email = 'player@test.com', password = 'secret1') {
  const session = agent();
  await session.post('/api/auth/register').send({ email, password }).expect(200);
  return session;
}

// ── Auth: session ───────────────────────────────────────────────────────

describe('GET /api/auth/session', () => {
  it('returns null user when not authenticated', async () => {
    const res = await agent().get('/api/auth/session').expect(200);
    expect(res.body).toEqual({ user: null });
  });

  it('returns the current user when authenticated', async () => {
    const session = await registerAndLogin();
    const res = await session.get('/api/auth/session').expect(200);
    expect(res.body.user.email).toBe('player@test.com');
  });
});

// ── Auth: register ──────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('rejects missing email or password', async () => {
    await agent().post('/api/auth/register').send({ password: 'x' }).expect(400);
    await agent().post('/api/auth/register').send({ email: 'a@b.c' }).expect(400);
    await agent().post('/api/auth/register').send({}).expect(400);
  });

  it('creates a user, logs them in and hashes the password', async () => {
    const session = agent();
    const res = await session
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'secret1' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('new@test.com');
    expect(res.body.user.username).toBe('Jugador');
    expect(res.body.user).not.toHaveProperty('password_hash');

    const stored = db.users.find((u) => u.email === 'new@test.com');
    expect(stored?.password_hash).toBeTruthy();
    expect(stored?.password_hash).not.toBe('secret1');
    expect(bcrypt.compareSync('secret1', stored!.password_hash!)).toBe(true);

    // The session cookie must authenticate subsequent requests.
    const me = await session.get('/api/auth/session').expect(200);
    expect(me.body.user.email).toBe('new@test.com');
  });

  it('normalizes the email to lowercase', async () => {
    const res = await agent()
      .post('/api/auth/register')
      .send({ email: 'Upper@Test.COM', password: 'secret1' })
      .expect(200);
    expect(res.body.user.email).toBe('upper@test.com');
  });

  it('rejects a duplicate email', async () => {
    await agent()
      .post('/api/auth/register')
      .send({ email: 'dup@test.com', password: 'secret1' })
      .expect(200);

    const res = await agent()
      .post('/api/auth/register')
      .send({ email: 'DUP@test.com', password: 'other12' })
      .expect(400);
    expect(res.body.error).toBe('El email ya está registrado');
  });

  it('returns 500 when the database fails', async () => {
    db.failOn = 'FROM users WHERE email';
    const res = await agent()
      .post('/api/auth/register')
      .send({ email: 'a@b.c', password: 'secret1' })
      .expect(500);
    expect(res.body.error).toBe('Error en el registro de usuario');
  });
});

// ── Auth: login ─────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('rejects missing email or password', async () => {
    await agent().post('/api/auth/login').send({ email: 'a@b.c' }).expect(400);
    await agent().post('/api/auth/login').send({ password: 'x' }).expect(400);
  });

  it('rejects unknown emails', async () => {
    const res = await agent()
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'secret1' })
      .expect(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });

  it('rejects a wrong password', async () => {
    seedUser({ email: 'login@test.com', password_hash: bcrypt.hashSync('secret1', 10) });

    const res = await agent()
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'wrong-pass' })
      .expect(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });

  it('rejects password login on Google-only accounts', async () => {
    seedUser({ email: 'google@test.com', google_id: 'g-123' });

    const res = await agent()
      .post('/api/auth/login')
      .send({ email: 'google@test.com', password: 'secret1' })
      .expect(400);
    expect(res.body.error).toBe('Esta cuenta solo tiene configurado inicio con Google');
  });

  it('logs in with valid credentials and keeps the session', async () => {
    seedUser({
      email: 'login@test.com',
      password_hash: bcrypt.hashSync('secret1', 10),
      total_points: 33,
      age: 9,
    });

    const session = agent();
    const res = await session
      .post('/api/auth/login')
      .send({ email: 'Login@Test.com', password: 'secret1' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({
      email: 'login@test.com',
      total_points: 33,
      age: 9,
    });
    expect(res.body.user).not.toHaveProperty('password_hash');

    const me = await session.get('/api/auth/session').expect(200);
    expect(me.body.user.email).toBe('login@test.com');
  });

  it('returns 500 when the database fails', async () => {
    db.failOn = 'FROM users WHERE email';
    const res = await agent()
      .post('/api/auth/login')
      .send({ email: 'a@b.c', password: 'secret1' })
      .expect(500);
    expect(res.body.error).toBe('Error en el inicio de sesión');
  });
});

// ── Auth: logout ────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('ends the session', async () => {
    const session = await registerAndLogin();

    await session.post('/api/auth/logout').expect(200, { success: true });

    const me = await session.get('/api/auth/session').expect(200);
    expect(me.body.user).toBeNull();
  });
});

// ── Auth: Google OAuth ──────────────────────────────────────────────────

describe('GET /api/auth/google', () => {
  it('returns 501 when Google OAuth is not configured', async () => {
    const res = await agent().get('/api/auth/google').expect(501);
    expect(res.body.error).toContain('Google OAuth no está configurado');
  });
});

// ── Profile ─────────────────────────────────────────────────────────────

describe('GET /api/profile', () => {
  it('requires authentication', async () => {
    const res = await agent().get('/api/profile').expect(401);
    expect(res.body.error).toBe('No autorizado');
  });

  it('returns the authenticated user profile', async () => {
    const session = await registerAndLogin();
    const res = await session.get('/api/profile').expect(200);

    expect(res.body).toMatchObject({
      email: 'player@test.com',
      username: 'Jugador',
      total_points: 0,
      age: null,
    });
  });

  it('returns 500 when the database fails', async () => {
    const session = await registerAndLogin();
    // deserializeUser runs the same SELECT before the route; let it through.
    db.failOn = 'created_at FROM users WHERE id';
    db.failSkip = 1;
    const res = await session.get('/api/profile').expect(500);
    expect(res.body.error).toBe('Error al obtener perfil');
  });
});

describe('POST /api/profile', () => {
  it('requires authentication', async () => {
    await agent().post('/api/profile').send({ age: 7 }).expect(401);
  });

  it('updates the age', async () => {
    const session = await registerAndLogin();
    const res = await session.post('/api/profile').send({ age: 7 }).expect(200);
    expect(res.body.age).toBe(7);

    const profile = await session.get('/api/profile').expect(200);
    expect(profile.body.age).toBe(7);
  });

  it('updates the username', async () => {
    const session = await registerAndLogin();
    const res = await session.post('/api/profile').send({ username: 'Pro' }).expect(200);
    expect(res.body.username).toBe('Pro');
  });

  it('updates several fields at once', async () => {
    const session = await registerAndLogin();
    const res = await session.post('/api/profile').send({ age: 9, username: 'Pro' }).expect(200);
    expect(res.body).toMatchObject({ age: 9, username: 'Pro' });
  });

  it('rejects an empty update', async () => {
    const session = await registerAndLogin();
    const res = await session.post('/api/profile').send({}).expect(400);
    expect(res.body.error).toBe('No hay campos para actualizar');
  });

  it('returns 500 when the database fails', async () => {
    const session = await registerAndLogin();
    db.failOn = 'UPDATE users SET';
    const res = await session.post('/api/profile').send({ age: 7 }).expect(500);
    expect(res.body.error).toBe('Error al actualizar perfil');
  });
});

describe('PUT /api/profile/points', () => {
  it('requires authentication', async () => {
    await agent().put('/api/profile/points').send({ total_points: 5 }).expect(401);
  });

  it('requires total_points', async () => {
    const session = await registerAndLogin();
    const res = await session.put('/api/profile/points').send({}).expect(400);
    expect(res.body.error).toBe('total_points requerido');
  });

  it('updates the points', async () => {
    const session = await registerAndLogin();
    const res = await session.put('/api/profile/points').send({ total_points: 42 }).expect(200);
    expect(res.body).toEqual({ total_points: 42 });

    const profile = await session.get('/api/profile').expect(200);
    expect(profile.body.total_points).toBe(42);
  });

  it('returns 500 when the database fails', async () => {
    const session = await registerAndLogin();
    db.failOn = 'UPDATE users SET total_points';
    const res = await session.put('/api/profile/points').send({ total_points: 1 }).expect(500);
    expect(res.body.error).toBe('Error al actualizar puntos');
  });
});

// ── Operations ──────────────────────────────────────────────────────────

describe('POST /api/operations', () => {
  it('requires authentication', async () => {
    await agent()
      .post('/api/operations')
      .send({ target_number: '1234', time_taken_ms: 1000 })
      .expect(401);
  });

  it('requires target_number and time_taken_ms', async () => {
    const session = await registerAndLogin();
    await session.post('/api/operations').send({ time_taken_ms: 1000 }).expect(400);
    await session.post('/api/operations').send({ target_number: '1234' }).expect(400);
  });

  it('stores an operation for the authenticated user', async () => {
    const session = await registerAndLogin();
    const res = await session
      .post('/api/operations')
      .send({ target_number: '1234', time_taken_ms: 4200 })
      .expect(200);

    expect(res.body).toMatchObject({
      user_id: 1,
      target_number: '1234',
      time_taken_ms: 4200,
    });
  });

  it('returns 500 when the database fails', async () => {
    const session = await registerAndLogin();
    db.failOn = 'INSERT INTO operations_log';
    const res = await session
      .post('/api/operations')
      .send({ target_number: '1234', time_taken_ms: 1000 })
      .expect(500);
    expect(res.body.error).toBe('Error al registrar operación');
  });
});

describe('GET /api/operations', () => {
  it('requires authentication', async () => {
    await agent().get('/api/operations').expect(401);
  });

  it('returns an empty history initially', async () => {
    const session = await registerAndLogin();
    const res = await session.get('/api/operations').expect(200);
    expect(res.body).toEqual([]);
  });

  it('returns the stored operations', async () => {
    const session = await registerAndLogin();
    await session
      .post('/api/operations')
      .send({ target_number: '1234', time_taken_ms: 3000 })
      .expect(200);
    await session
      .post('/api/operations')
      .send({ target_number: '9876', time_taken_ms: 1500 })
      .expect(200);

    const res = await session.get('/api/operations').expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].time_taken_ms).toBe(3000);
    expect(res.body[1].time_taken_ms).toBe(1500);
  });

  it('only returns operations of the authenticated user', async () => {
    const first = await registerAndLogin('one@test.com');
    await first
      .post('/api/operations')
      .send({ target_number: '1111', time_taken_ms: 900 })
      .expect(200);

    const second = await registerAndLogin('two@test.com');
    const res = await second.get('/api/operations').expect(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when the database fails', async () => {
    const session = await registerAndLogin();
    db.failOn = 'FROM operations_log WHERE user_id';
    const res = await session.get('/api/operations').expect(500);
    expect(res.body.error).toBe('Error al obtener historial');
  });
});
