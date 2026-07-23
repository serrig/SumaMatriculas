import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { GameService } from './game.service';

const HISTORY = [
  { created_at: '2026-07-21T09:00:00.000Z', time_taken_ms: 3000 },
  { created_at: '2026-07-20T10:00:00.000Z', time_taken_ms: 4000 },
  { created_at: '2026-07-20T12:00:00.000Z', time_taken_ms: 8000 },
];

describe('ProfileComponent', () => {
  function makeMock(overrides: {
    userId?: number | null;
    points?: number;
    history?: { data: unknown; error: unknown };
  } = {}) {
    const {
      userId = 7,
      points = 42,
      history = { data: [], error: null },
    } = overrides;

    return {
      userId: signal(userId),
      points: signal(points),
      session: signal({ id: userId, email: 'player@test.com' }),
      fetchOperationHistory: vi.fn().mockResolvedValue(history),
    };
  }

  async function configure(mock: ReturnType<typeof makeMock>) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [{ provide: GameService, useValue: mock }],
    }).compileComponents();
  }

  async function create() {
    const fixture = TestBed.createComponent(ProfileComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('creates the component and stops loading', async () => {
    await configure(makeMock());
    const fixture = await create();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.error()).toBeNull();
  });

  it('computes stats from the operation history', async () => {
    await configure(makeMock({ history: { data: HISTORY, error: null } }));
    const fixture = await create();
    const component = fixture.componentInstance;

    expect(component.totalOps()).toBe(3);
    expect(component.avgSpeedMs()).toBe(5000); // (3000 + 4000 + 8000) / 3
    expect(component.bestTimeMs()).toBe(3000);
    expect(component.dailyOps()).toEqual([
      { date: '2026-07-20', count: 2 },
      { date: '2026-07-21', count: 1 },
    ]);
    expect(component.maxDaily()).toBe(2);
    expect(component.hasData()).toBe(true);
  });

  it('renders the points hero and stats grid when there is data', async () => {
    await configure(makeMock({ history: { data: HISTORY, error: null } }));
    const fixture = await create();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.hero-points')?.textContent?.trim()).toBe('42');
    expect(el.querySelector('.profile-email')?.textContent).toContain('player@test.com');
    expect(el.querySelectorAll('.stat-card').length).toBe(3);
    expect(el.querySelectorAll('.bar-item').length).toBe(2);
  });

  it('shows the empty state when there is no history', async () => {
    await configure(makeMock());
    const fixture = await create();
    const component = fixture.componentInstance;

    expect(component.hasData()).toBe(false);
    expect(component.totalOps()).toBe(0);
    expect(component.bestTimeMs()).toBe(0);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.profile-empty')).toBeTruthy();
    expect(el.querySelector('.empty-points-value')?.textContent?.trim()).toBe('42');
  });

  it('shows an error when the user is not authenticated', async () => {
    await configure(makeMock({ userId: null }));
    const fixture = await create();
    const component = fixture.componentInstance;

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Usuario no autenticado');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.profile-error')).toBeTruthy();
  });

  it('shows an error when the history request fails', async () => {
    await configure(makeMock({ history: { data: null, error: new Error('boom') } }));
    const fixture = await create();

    expect(fixture.componentInstance.error()).toBe('boom');
  });

  it('uses a friendly fallback message for non-Error failures', async () => {
    await configure(makeMock({ history: { data: null, error: 'string failure' } }));
    const fixture = await create();

    expect(fixture.componentInstance.error()).toBe(
      'No pudimos cargar tus estadísticas. Revisa tu conexión.',
    );
  });

  it('emits back when goBack is called', async () => {
    await configure(makeMock());
    const fixture = await create();
    const component = fixture.componentInstance;

    const emitted: unknown[] = [];
    component.back.subscribe(() => emitted.push(true));
    component.goBack();

    expect(emitted).toHaveLength(1);
  });

  describe('formatTime', () => {
    let component: ProfileComponent;

    beforeEach(async () => {
      await configure(makeMock());
      component = (await create()).componentInstance;
    });

    it('formats durations', () => {
      expect(component.formatTime(0)).toBe('--');
      expect(component.formatTime(500)).toBe('< 1s');
      expect(component.formatTime(5000)).toBe('5s');
      expect(component.formatTime(59999)).toBe('60s');
      expect(component.formatTime(90000)).toBe('1m 30s');
    });
  });

  describe('speed indicators', () => {
    let component: ProfileComponent;

    beforeEach(async () => {
      await configure(makeMock());
      component = (await create()).componentInstance;
    });

    it('picks an emoji by average speed', () => {
      component.avgSpeedMs.set(0);
      expect(component.speedEmoji()).toBe('⏱️');
      component.avgSpeedMs.set(4000);
      expect(component.speedEmoji()).toBe('🚀');
      component.avgSpeedMs.set(10000);
      expect(component.speedEmoji()).toBe('🐇');
      component.avgSpeedMs.set(20000);
      expect(component.speedEmoji()).toBe('🐢');
    });

    it('picks a label by average speed', () => {
      component.avgSpeedMs.set(0);
      expect(component.speedText()).toBe('por operación');
      component.avgSpeedMs.set(4000);
      expect(component.speedText()).toBe('¡muy rápido!');
      component.avgSpeedMs.set(10000);
      expect(component.speedText()).toBe('buen ritmo');
      component.avgSpeedMs.set(20000);
      expect(component.speedText()).toBe('con calma');
    });

    it('clamps the gauge pointer between 3% and 97%', () => {
      component.avgSpeedMs.set(0);
      expect(component.speedPercent()).toBe(0);

      component.avgSpeedMs.set(30000);
      expect(component.speedPercent()).toBe(3);

      component.avgSpeedMs.set(60000);
      expect(component.speedPercent()).toBe(3);

      component.avgSpeedMs.set(1500);
      expect(component.speedPercent()).toBe(95);
    });
  });

  describe('chart helpers', () => {
    let component: ProfileComponent;

    beforeEach(async () => {
      await configure(makeMock());
      component = (await create()).componentInstance;
    });

    it('formats day labels in Spanish', () => {
      expect(component.formatDayLabel('2026-01-04')).toBe('DOM'); // Sunday
      expect(component.formatDayLabel('2026-01-05')).toBe('LUN'); // Monday
    });

    it('cycles bar colors', () => {
      expect(component.barColor(0)).toBe(component.barColor(5));
      expect(component.barColor(1)).not.toBe(component.barColor(2));
    });

    it('tracks bars by date', () => {
      expect(component.trackByDate(0, { date: '2026-07-20' })).toBe('2026-07-20');
    });
  });

  describe('fun facts', () => {
    let component: ProfileComponent;

    beforeEach(async () => {
      await configure(makeMock({ points: 42 }));
      component = (await create()).componentInstance;
    });

    it('picks an emoji by total operations', () => {
      const cases: [number, string][] = [
        [120, '🏅'],
        [50, '🌟'],
        [20, '🎯'],
        [10, '💪'],
        [5, '👏'],
        [1, '🌱'],
      ];
      for (const [ops, emoji] of cases) {
        component.totalOps.set(ops);
        expect(component.funEmoji()).toBe(emoji);
      }
    });

    it('builds a motivational message by total operations', () => {
      component.totalOps.set(0);
      expect(component.funFact()).toContain('primer paso');

      component.totalOps.set(3);
      expect(component.funFact()).toContain('primera operación');

      component.totalOps.set(10);
      expect(component.funFact()).toContain('42 puntos');

      component.totalOps.set(100);
      expect(component.funFact()).toContain('campeón');
    });
  });
});
