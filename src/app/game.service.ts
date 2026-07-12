import { Injectable, signal } from '@angular/core';
import { environment } from '../environments/environment';

export interface UserSession {
  id: number;
  email: string;
  username?: string;
  total_points?: number;
  age?: number;
}

export interface GameOperationPart {
  type: 'text' | 'input';
  value: string;
  inputIndex?: number;
}

export interface GameOperation {
  originalFormula: string;
  parts: GameOperationPart[];
  expectedValues: number[];
  userInputs: (number | null)[];
  isCorrect: boolean;
  opTotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // Game State
  currentLevel = signal<number>(1);
  currentNumber = signal<string>('0000');
  operations = signal<GameOperation[]>([]);
  points = signal<number>(0);
  timeStart = signal<number>(Date.now());
  message = signal<string>('¡Bienvenido! Completa las sumas y gana puntos.');

  // Auth & Profile State
  authLoaded = signal<boolean>(false);
  profileLoaded = signal<boolean>(false);
  session = signal<UserSession | null>(null);
  userId = signal<number | null>(null);
  userAge = signal<number | null>(null);

  // Session inactivity timeout
  sessionExpiringSoon = signal<boolean>(false);
  private readonly INACTIVITY_LIMIT_MS = 30 * 60 * 1000;    // 30 minutos
  private readonly WARNING_BEFORE_MS = 2 * 60 * 1000;        // avisar 2 min antes
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly apiUrl = environment.apiUrl;

  constructor() {
    this.initAuth();
  }

  async initAuth() {
    try {
      const response = await fetch(this.apiUrl + '/api/auth/session');
      const data = await response.json();

      if (data.user) {
        this.session.set(data.user);
        this.userId.set(data.user.id);
        this.startInactivityMonitor();
        await this.fetchProfile();
      } else {
        this.session.set(null);
        this.userId.set(null);
        this.profileLoaded.set(true);
      }
    } catch (err) {
      console.error('Error checking session:', err);
    } finally {
      this.authLoaded.set(true);
    }
  }

  async fetchProfile() {
    const uid = this.userId();
    if (!uid) {
      this.profileLoaded.set(true);
      return;
    }

    try {
      const response = await fetch(this.apiUrl + '/api/profile');
      if (response.ok) {
        const data = await response.json();
        this.points.set(data.total_points || 0);
        this.userAge.set(data.age || null);

        if (data.age) {
          this.setLevel(data.age < 8 ? 1 : 2);
        } else {
          this.generateNewRound();
        }
      } else if (response.status === 404) {
        // Perfil no encontrado — se creará al guardar la edad
        this.userAge.set(null);
        this.points.set(0);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      this.userAge.set(null);
      this.points.set(0);
    } finally {
      this.profileLoaded.set(true);
    }
  }

  async login(email: string, pass: string) {
    try {
      const response = await fetch(this.apiUrl + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await response.json();
      if (response.ok) {
        this.session.set(data.user);
        this.userId.set(data.user.id);
        this.startInactivityMonitor();
        await this.fetchProfile();
        return null;
      }
      return { message: data.error || 'Error al iniciar sesión' };
    } catch (err) {
      return { message: 'Error de conexión' };
    }
  }

  loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  async register(email: string, pass: string) {
    try {
      const response = await fetch(this.apiUrl + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await response.json();
      if (response.ok) {
        this.session.set(data.user);
        this.userId.set(data.user.id);
        this.startInactivityMonitor();
        await this.fetchProfile();
        return null;
      }
      return { message: data.error || 'Error al registrarse' };
    } catch (err) {
      return { message: 'Error de conexión' };
    }
  }

  async logout() {
    this.clearInactivityTimers();
    this.sessionExpiringSoon.set(false);
    try {
      await fetch(this.apiUrl + '/api/auth/logout', { method: 'POST' });
    } catch {
      // Best effort
    }
    this.session.set(null);
    this.userId.set(null);
    this.userAge.set(null);
    this.points.set(0);
    this.profileLoaded.set(true);
  }

  // ── Inactivity monitor ──────────────────────────────────────────────

  startInactivityMonitor() {
    const resetTimer = () => {
      if (!this.session()) return;

      this.sessionExpiringSoon.set(false);
      this.clearInactivityTimers();

      this.warningTimer = setTimeout(() => {
        if (this.session()) {
          this.sessionExpiringSoon.set(true);
        }
      }, this.INACTIVITY_LIMIT_MS - this.WARNING_BEFORE_MS);

      this.inactivityTimer = setTimeout(() => {
        if (this.session()) {
          console.log('🔒 Sesión cerrada por inactividad');
          this.logout();
        }
      }, this.INACTIVITY_LIMIT_MS);
    };

    ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach(event =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    resetTimer();
  }

  extendSession() {
    this.sessionExpiringSoon.set(false);
    this.clearInactivityTimers();
    this.startInactivityMonitor();
  }

  private clearInactivityTimers() {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer !== null) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  // ── Profile data ────────────────────────────────────────────────────

  async saveAge(age: number) {
    const uid = this.userId();
    if (!uid) return { message: 'Usuario no autenticado' };
    try {
      const response = await fetch(this.apiUrl + '/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age }),
      });
      if (response.ok) {
        this.userAge.set(age);
        this.setLevel(age < 8 ? 1 : 2);
        return null;
      }
      return { message: 'Error al guardar la edad' };
    } catch {
      return { message: 'Error de conexión' };
    }
  }

  // ── Game logic ──────────────────────────────────────────────────────

  setLevel(level: number) {
    this.currentLevel.set(level);
    this.generateNewRound();
  }

  generateNewRound() {
    const val = Math.floor(Math.random() * 10000);
    const target = val.toString().padStart(4, '0');
    this.currentNumber.set(target);

    const d0 = target.charAt(0);
    const d1 = target.charAt(1);
    const d2 = target.charAt(2);
    const d3 = target.charAt(3);
    const n0 = Number(d0);
    const n1 = Number(d1);
    const n2 = Number(d2);
    const n3 = Number(d3);

    let combis: GameOperation[] = [];

    if (this.currentLevel() === 1) {
      const baseTotal = n0 + n1 + n2 + n3;
      combis = [
        {
          originalFormula: `(${d0} + ${d1}) + ${d2} + ${d3}`,
          parts: [
            { type: 'input', value: '', inputIndex: 0 },
            { type: 'text', value: ` + ${d2} + ${d3}` }
          ],
          expectedValues: [n0 + n1],
          userInputs: [null],
          isCorrect: false,
          opTotal: baseTotal
        },
        {
          originalFormula: `${d0} + (${d1} + ${d2}) + ${d3}`,
          parts: [
            { type: 'text', value: `${d0} + ` },
            { type: 'input', value: '', inputIndex: 0 },
            { type: 'text', value: ` + ${d3}` }
          ],
          expectedValues: [n1 + n2],
          userInputs: [null],
          isCorrect: false,
          opTotal: baseTotal
        },
        {
          originalFormula: `${d0} + ${d1} + (${d2} + ${d3})`,
          parts: [
            { type: 'text', value: `${d0} + ${d1} + ` },
            { type: 'input', value: '', inputIndex: 0 }
          ],
          expectedValues: [n2 + n3],
          userInputs: [null],
          isCorrect: false,
          opTotal: baseTotal
        },
        {
          originalFormula: `(${d0} + ${d1}) + (${d2} + ${d3})`,
          parts: [
            { type: 'input', value: '', inputIndex: 0 },
            { type: 'text', value: ' + ' },
            { type: 'input', value: '', inputIndex: 1 }
          ],
          expectedValues: [n0 + n1, n2 + n3],
          userInputs: [null, null],
          isCorrect: false,
          opTotal: baseTotal
        }
      ];
    } else {
      combis = [
        {
          originalFormula: `(${d0}${d1}) + ${d2} + ${d3}`,
          parts: [
            { type: 'input', value: '', inputIndex: 0 },
            { type: 'text', value: ` + ${d2} + ${d3}` }
          ],
          expectedValues: [Number(`${d0}${d1}`)],
          userInputs: [null],
          isCorrect: false,
          opTotal: Number(`${d0}${d1}`) + n2 + n3
        },
        {
          originalFormula: `${d0} + (${d1}${d2}) + ${d3}`,
          parts: [
            { type: 'text', value: `${d0} + ` },
            { type: 'input', value: '', inputIndex: 0 },
            { type: 'text', value: ` + ${d3}` }
          ],
          expectedValues: [Number(`${d1}${d2}`)],
          userInputs: [null],
          isCorrect: false,
          opTotal: n0 + Number(`${d1}${d2}`) + n3
        },
        {
          originalFormula: `${d0} + ${d1} + (${d2}${d3})`,
          parts: [
            { type: 'text', value: `${d0} + ${d1} + ` },
            { type: 'input', value: '', inputIndex: 0 }
          ],
          expectedValues: [Number(`${d2}${d3}`)],
          userInputs: [null],
          isCorrect: false,
          opTotal: n0 + n1 + Number(`${d2}${d3}`)
        }
      ];
    }

    this.operations.set(combis);
    this.message.set('¡Calcula las sumas parciales!');
    this.timeStart.set(Date.now());
  }

  updateInput(opIndex: number, inputIndex: number, val: number | null) {
    const ops = this.operations();
    const op = ops[opIndex];
    op.userInputs[inputIndex] = val;

    op.isCorrect = op.expectedValues.every((exp, idx) => op.userInputs[idx] === exp);

    this.operations.set([...ops]);
    this.checkWinCondition();
  }

  async checkWinCondition() {
    const isWin = this.operations().every(o => o.isCorrect);
    if (isWin) {
      const pointsToAward = this.currentLevel() === 1 ? 1 : 5;
      this.message.set(`¡Correcto! +${pointsToAward} Puntos.`);
      const newPoints = this.points() + pointsToAward;
      this.points.set(newPoints);

      const timeTakenMs = Date.now() - this.timeStart();

      const uid = this.userId();
      if (uid) {
        try {
          await fetch(this.apiUrl + '/api/profile/points', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total_points: newPoints }),
          });
          await fetch(this.apiUrl + '/api/operations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target_number: this.currentNumber(),
              time_taken_ms: timeTakenMs,
            }),
          });
        } catch (err) {
          console.error('Error saving game result:', err);
        }
      }

      setTimeout(() => this.generateNewRound(), 2500);
    }
  }

  async fetchOperationHistory(): Promise<{
    data: { created_at: string; time_taken_ms: number }[] | null;
    error: any;
  }> {
    const uid = this.userId();
    if (!uid) return { data: null, error: new Error('Usuario no autenticado') };
    try {
      const response = await fetch(this.apiUrl + '/api/operations');
      if (response.ok) {
        const data = await response.json();
        return { data, error: null };
      }
      return { data: null, error: 'Error al obtener historial' };
    } catch (err) {
      return { data: null, error: err };
    }
  }
}
