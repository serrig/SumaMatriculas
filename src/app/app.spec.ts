import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { GameService } from './game.service';

function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function stubFetch(handler: (url: string) => unknown) {
  const mock = vi.fn(async (input: RequestInfo | URL) => fakeResponse(handler(String(input))));
  vi.stubGlobal('fetch', mock);
  return mock;
}

const USER = { id: 7, email: 'player@test.com', username: 'Jugador' };

function noSession(url: string): unknown {
  if (url.endsWith('/api/auth/session')) return { user: null };
  throw new Error(`Unexpected fetch in test: ${url}`);
}

function withProfile(profile: unknown) {
  return (url: string): unknown => {
    if (url.endsWith('/api/auth/session')) return { user: USER };
    if (url.endsWith('/api/profile')) return profile;
    throw new Error(`Unexpected fetch in test: ${url}`);
  };
}

/** Lets the GameService constructor's initAuth() promise chain settle. */
async function flush(times = 5) {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the app', () => {
    stubFetch(noSession);
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows a loading state while auth is being checked', () => {
    stubFetch(noSession);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.loading-state')?.textContent).toContain('Cargando');
  });

  it('shows the auth form when there is no session', async () => {
    stubFetch(noSession);
    const fixture = TestBed.createComponent(App);
    await flush();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-auth')).toBeTruthy();
    expect(el.querySelector('.game-container')).toBeNull();
  });

  it('asks for the age when the profile has none', async () => {
    stubFetch(withProfile({ total_points: 0, age: null }));
    const fixture = TestBed.createComponent(App);
    await flush();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-age-profile')).toBeTruthy();
    expect(el.querySelector('.game-container')).toBeNull();
  });

  it('shows the game when the user is fully set up', async () => {
    stubFetch(withProfile({ total_points: 15, age: 7 }));
    const fixture = TestBed.createComponent(App);
    await flush();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.game-container')).toBeTruthy();
    expect(el.querySelector('.user-greeting')?.textContent).toContain('player@test.com');
    expect(el.querySelector('.score-board .value')?.textContent?.trim()).toBe('15');
    expect(el.querySelector('.level-indicator strong')?.textContent?.trim()).toBe('1');
    expect(el.querySelectorAll('.target-number .digit').length).toBe(4);
    expect(el.querySelectorAll('.operation-row').length).toBe(4);
  });

  it('toggles the age editor and the profile view', () => {
    stubFetch(noSession);
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.showAgeEditor()).toBe(false);
    app.toggleAgeEditor();
    expect(app.showAgeEditor()).toBe(true);

    expect(app.showProfile()).toBe(false);
    app.toggleProfile();
    expect(app.showProfile()).toBe(true);
  });

  it('hides the age editor automatically once an age is saved', () => {
    stubFetch(noSession);
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const gameService = TestBed.inject(GameService);

    app.showAgeEditor.set(true);
    gameService.userAge.set(8);
    fixture.detectChanges();

    expect(app.showAgeEditor()).toBe(false);
  });
});
