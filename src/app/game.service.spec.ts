import { GameService, GameOperation } from './game.service';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Minimal fetch Response stub (microtask-only, safe with fake timers). */
function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

type FetchHandler = (url: string, init?: RequestInit) => unknown;

function stubFetch(handler: FetchHandler) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    fakeResponse(handler(String(input), init)),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Flush pending microtasks (works with plain-object responses, no timers needed). */
async function flushMicrotasks(times = 30) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function NO_SESSION(url: string): unknown {
  if (url.endsWith('/api/auth/session')) return { user: null };
  throw new Error(`Unexpected fetch in test: ${url}`);
}

const USER = { id: 7, email: 'player@test.com', username: 'Jugador' };

function authenticatedHandler(profile: unknown = { total_points: 12, age: 6 }) {
  return (url: string): unknown => {
    if (url.endsWith('/api/auth/session')) return { user: USER };
    if (url.endsWith('/api/profile')) return profile;
    throw new Error(`Unexpected fetch in test: ${url}`);
  };
}

/** Creates a service and waits for the constructor's initAuth() to settle. */
async function createService(): Promise<GameService> {
  const service = new GameService();
  await flushMicrotasks();
  return service;
}

// ── Suite ───────────────────────────────────────────────────────────────

describe('GameService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initAuth', () => {
    it('starts unauthenticated when there is no active session', async () => {
      stubFetch(NO_SESSION);
      const service = await createService();

      expect(service.authLoaded()).toBe(true);
      expect(service.session()).toBeNull();
      expect(service.userId()).toBeNull();
      expect(service.profileLoaded()).toBe(true);
    });

    it('loads session and profile when a user is logged in', async () => {
      stubFetch(authenticatedHandler({ total_points: 25, age: 9 }));
      const service = await createService();

      expect(service.session()?.email).toBe('player@test.com');
      expect(service.userId()).toBe(7);
      expect(service.points()).toBe(25);
      expect(service.userAge()).toBe(9);
      expect(service.profileLoaded()).toBe(true);
    });

    it('sets level 1 for children under 8 and level 2 for 8+', async () => {
      stubFetch(authenticatedHandler({ total_points: 0, age: 6 }));
      const young = await createService();
      expect(young.currentLevel()).toBe(1);

      vi.unstubAllGlobals();
      stubFetch(authenticatedHandler({ total_points: 0, age: 8 }));
      const older = await createService();
      expect(older.currentLevel()).toBe(2);
    });

    it('handles a 404 profile by resetting points and age', async () => {
      const mock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/auth/session')) return fakeResponse({ user: USER });
        if (url.endsWith('/api/profile')) return fakeResponse({}, 404);
        throw new Error(`Unexpected fetch in test: ${url}`);
      });
      vi.stubGlobal('fetch', mock);

      const service = await createService();
      expect(service.userAge()).toBeNull();
      expect(service.points()).toBe(0);
      expect(service.profileLoaded()).toBe(true);
    });

    it('marks auth as loaded even when the session request fails', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('network down'))));
      const service = await createService();

      expect(service.authLoaded()).toBe(true);
      expect(service.session()).toBeNull();
    });
  });

  describe('generateNewRound', () => {
    beforeEach(() => {
      stubFetch(NO_SESSION);
    });

    it('generates a 4-digit padded target number', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.00005); // -> 0 -> '0000'
      const service = await createService();

      service.generateNewRound();
      expect(service.currentNumber()).toBe('0000');

      vi.spyOn(Math, 'random').mockReturnValue(0.42312); // -> 4231
      service.generateNewRound();
      expect(service.currentNumber()).toBe('4231');
    });

    it('builds 4 operations with correct partial sums at level 1', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.12345); // -> '1234'
      const service = await createService();
      service.setLevel(1);

      const ops = service.operations();
      expect(ops).toHaveLength(4);
      expect(service.currentNumber()).toBe('1234');

      expect(ops[0].expectedValues).toEqual([3]); // 1 + 2
      expect(ops[1].expectedValues).toEqual([5]); // 2 + 3
      expect(ops[2].expectedValues).toEqual([7]); // 3 + 4
      expect(ops[3].expectedValues).toEqual([3, 7]); // (1+2) and (3+4)
      for (const op of ops) {
        expect(op.opTotal).toBe(10); // 1+2+3+4
        expect(op.isCorrect).toBe(false);
        expect(op.userInputs.every((v) => v === null)).toBe(true);
      }
      expect(service.message()).toBe('¡Calcula las sumas parciales!');
    });

    it('builds 3 operations with two-digit groupings at level 2', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.12345); // -> '1234'
      const service = await createService();
      service.setLevel(2);

      const ops = service.operations();
      expect(ops).toHaveLength(3);

      expect(ops[0].expectedValues).toEqual([12]);
      expect(ops[0].opTotal).toBe(19); // 12 + 3 + 4
      expect(ops[1].expectedValues).toEqual([23]);
      expect(ops[1].opTotal).toBe(28); // 1 + 23 + 4
      expect(ops[2].expectedValues).toEqual([34]);
      expect(ops[2].opTotal).toBe(37); // 1 + 2 + 34
    });
  });

  describe('updateInput / checkWinCondition', () => {
    beforeEach(() => {
      stubFetch(NO_SESSION);
      vi.spyOn(Math, 'random').mockReturnValue(0.12345); // -> '1234'
    });

    function fillAll(service: GameService, ops: GameOperation[], correct: boolean) {
      ops.forEach((op, opIndex) => {
        op.expectedValues.forEach((exp, inputIndex) => {
          service.updateInput(opIndex, inputIndex, correct ? exp : exp + 1);
        });
      });
    }

    it('marks an operation as correct only when all its inputs match', async () => {
      const service = await createService();
      service.setLevel(1);

      service.updateInput(3, 0, 3); // two-input operation, first value only
      expect(service.operations()[3].isCorrect).toBe(false);

      service.updateInput(3, 1, 7);
      expect(service.operations()[3].isCorrect).toBe(true);

      service.updateInput(0, 0, 99);
      expect(service.operations()[0].isCorrect).toBe(false);
    });

    it('awards 1 point and shows a success message on win at level 1', async () => {
      vi.useFakeTimers();
      const service = await createService();
      service.setLevel(1);
      const regenSpy = vi.spyOn(service, 'generateNewRound');
      regenSpy.mockClear(); // ignore the call from setLevel

      fillAll(service, service.operations(), true);
      await flushMicrotasks();

      expect(service.message()).toBe('¡Correcto! +1 Puntos.');
      expect(service.points()).toBe(1);

      await vi.advanceTimersByTimeAsync(2500);
      expect(regenSpy).toHaveBeenCalledTimes(1);
    });

    it('awards 5 points on win at level 2', async () => {
      vi.useFakeTimers();
      const service = await createService();
      service.setLevel(2);

      fillAll(service, service.operations(), true);
      await flushMicrotasks();

      expect(service.message()).toBe('¡Correcto! +5 Puntos.');
      expect(service.points()).toBe(5);
    });

    it('does not award points while any operation is incorrect', async () => {
      const service = await createService();
      service.setLevel(1);

      const ops = service.operations();
      // Fill everything correctly except the last input of the last op.
      ops.forEach((op, opIndex) => {
        op.expectedValues.forEach((exp, inputIndex) => {
          const isLast = opIndex === ops.length - 1 && inputIndex === op.expectedValues.length - 1;
          service.updateInput(opIndex, inputIndex, isLast ? exp + 1 : exp);
        });
      });
      await flushMicrotasks();

      expect(service.points()).toBe(0);
      expect(service.message()).not.toContain('¡Correcto!');
    });

    it('persists points and operation history when logged in', async () => {
      vi.useFakeTimers();
      const calls: { url: string; init?: RequestInit }[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          calls.push({ url, init });
          if (url.endsWith('/api/auth/session')) return fakeResponse({ user: USER });
          if (url.endsWith('/api/profile')) return fakeResponse({ total_points: 10, age: 9 });
          if (url.endsWith('/api/profile/points')) return fakeResponse({ total_points: 15 });
          if (url.endsWith('/api/operations')) return fakeResponse({});
          throw new Error(`Unexpected fetch in test: ${url}`);
        }),
      );
      const service = await createService();
      service.setLevel(2);

      fillAll(service, service.operations(), true);
      await flushMicrotasks();

      expect(service.points()).toBe(15); // 10 from profile + 5 won
      const pointsCall = calls.find((c) => c.url.endsWith('/api/profile/points'));
      const opsCall = calls.find((c) => c.url.endsWith('/api/operations'));
      expect(pointsCall?.init?.method).toBe('PUT');
      expect(JSON.parse(String(pointsCall?.init?.body))).toEqual({ total_points: 15 });
      expect(opsCall?.init?.method).toBe('POST');
      expect(JSON.parse(String(opsCall?.init?.body))).toEqual({
        target_number: '1234',
        time_taken_ms: expect.any(Number),
      });
    });
  });

  describe('login / register / logout', () => {
    it('login stores the session on success', async () => {
      stubFetch((url) => {
        if (url.endsWith('/api/auth/session')) return { user: null };
        if (url.endsWith('/api/auth/login')) return { user: USER };
        if (url.endsWith('/api/profile')) return { total_points: 3, age: 7 };
        throw new Error(`Unexpected fetch in test: ${url}`);
      });
      const service = await createService();

      const err = await service.login('player@test.com', 'secret1');

      expect(err).toBeNull();
      expect(service.session()?.id).toBe(7);
      expect(service.userId()).toBe(7);
      expect(service.userAge()).toBe(7);
      expect(service.points()).toBe(3);
    });

    it('login returns the server error message on failure', async () => {
      const mock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/auth/session')) return fakeResponse({ user: null });
        return fakeResponse({ error: 'Credenciales inválidas' }, 401);
      });
      vi.stubGlobal('fetch', mock);
      const service = await createService();

      const err = await service.login('a@b.c', 'wrong');
      expect(err).toEqual({ message: 'Credenciales inválidas' });
      expect(service.session()).toBeNull();
    });

    it('login returns a connection error when fetch rejects', async () => {
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/auth/session')) return fakeResponse({ user: null });
        return Promise.reject(new Error('offline'));
      }));
      const service = await createService();

      const err = await service.login('a@b.c', 'x');
      expect(err).toEqual({ message: 'Error de conexión' });
    });

    it('register stores the session on success', async () => {
      stubFetch((url) => {
        if (url.endsWith('/api/auth/session')) return { user: null };
        if (url.endsWith('/api/auth/register')) return { user: USER };
        if (url.endsWith('/api/profile')) return { total_points: 0, age: 10 };
        throw new Error(`Unexpected fetch in test: ${url}`);
      });
      const service = await createService();

      const err = await service.register('new@test.com', 'secret1');

      expect(err).toBeNull();
      expect(service.session()?.email).toBe('player@test.com');
      expect(service.currentLevel()).toBe(2);
    });

    it('register returns the server error message on failure', async () => {
      const mock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/auth/session')) return fakeResponse({ user: null });
        return fakeResponse({ error: 'El email ya está registrado' }, 400);
      });
      vi.stubGlobal('fetch', mock);
      const service = await createService();

      const err = await service.register('dup@test.com', 'secret1');
      expect(err).toEqual({ message: 'El email ya está registrado' });
    });

    it('logout clears session, age and points', async () => {
      const mock = stubFetch(authenticatedHandler({ total_points: 30, age: 8 }));
      const service = await createService();
      expect(service.session()).not.toBeNull();

      await service.logout();

      expect(service.session()).toBeNull();
      expect(service.userId()).toBeNull();
      expect(service.userAge()).toBeNull();
      expect(service.points()).toBe(0);
      expect(mock.mock.calls.some(([input]) => String(input).endsWith('/api/auth/logout'))).toBe(true);
    });
  });

  describe('saveAge', () => {
    it('rejects when there is no authenticated user', async () => {
      stubFetch(NO_SESSION);
      const service = await createService();

      const err = await service.saveAge(7);
      expect(err).toEqual({ message: 'Usuario no autenticado' });
    });

    it('saves age and adjusts the level on success', async () => {
      stubFetch(authenticatedHandler({ total_points: 0, age: null }));
      const service = await createService();

      const err = await service.saveAge(9);

      expect(err).toBeNull();
      expect(service.userAge()).toBe(9);
      expect(service.currentLevel()).toBe(2);
    });

    it('returns an error message when the server fails', async () => {
      const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/auth/session')) return fakeResponse({ user: USER });
        if (url.endsWith('/api/profile') && init?.method === 'POST') return fakeResponse({}, 500);
        if (url.endsWith('/api/profile')) return fakeResponse({ total_points: 0, age: null });
        throw new Error(`Unexpected fetch in test: ${url}`);
      });
      vi.stubGlobal('fetch', mock);
      const service = await createService();

      const err = await service.saveAge(7);
      expect(err).toEqual({ message: 'Error al guardar la edad' });
      expect(service.userAge()).toBeNull();
    });
  });

  describe('fetchOperationHistory', () => {
    it('requires an authenticated user', async () => {
      stubFetch(NO_SESSION);
      const service = await createService();

      const { data, error } = await service.fetchOperationHistory();
      expect(data).toBeNull();
      expect(error).toBeTruthy();
    });

    it('returns history data on success', async () => {
      const history = [{ created_at: '2026-07-01T10:00:00Z', time_taken_ms: 5000 }];
      stubFetch((url) => {
        if (url.endsWith('/api/auth/session')) return { user: USER };
        if (url.endsWith('/api/profile')) return { total_points: 0, age: 7 };
        if (url.endsWith('/api/operations')) return history;
        throw new Error(`Unexpected fetch in test: ${url}`);
      });
      const service = await createService();

      const { data, error } = await service.fetchOperationHistory();
      expect(error).toBeNull();
      expect(data).toEqual(history);
    });

    it('returns an error when the request fails', async () => {
      const mock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/auth/session')) return fakeResponse({ user: USER });
        if (url.endsWith('/api/profile')) return fakeResponse({ total_points: 0, age: 7 });
        return fakeResponse({}, 500);
      });
      vi.stubGlobal('fetch', mock);
      const service = await createService();

      const { data, error } = await service.fetchOperationHistory();
      expect(data).toBeNull();
      expect(error).toBe('Error al obtener historial');
    });
  });

  describe('inactivity monitor', () => {
    it('warns 2 minutes before the 30-minute limit and then logs out', async () => {
      vi.useFakeTimers();
      const mock = stubFetch(authenticatedHandler());
      const service = await createService();
      expect(service.session()).not.toBeNull();

      await vi.advanceTimersByTimeAsync(28 * 60 * 1000);
      expect(service.sessionExpiringSoon()).toBe(true);
      expect(service.session()).not.toBeNull();

      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(service.session()).toBeNull();
      expect(mock.mock.calls.some(([input]) => String(input).endsWith('/api/auth/logout'))).toBe(true);
    });

    it('extendSession hides the warning and restarts the countdown', async () => {
      vi.useFakeTimers();
      stubFetch(authenticatedHandler());
      const service = await createService();

      await vi.advanceTimersByTimeAsync(28 * 60 * 1000);
      expect(service.sessionExpiringSoon()).toBe(true);

      service.extendSession();
      expect(service.sessionExpiringSoon()).toBe(false);

      // After extending, the full 28 minutes must elapse again before warning.
      await vi.advanceTimersByTimeAsync(27 * 60 * 1000);
      expect(service.sessionExpiringSoon()).toBe(false);
      expect(service.session()).not.toBeNull();

      await vi.advanceTimersByTimeAsync(1 * 60 * 1000);
      expect(service.sessionExpiringSoon()).toBe(true);
    });
  });
});
