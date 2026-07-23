import { TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth.component';
import { GameService } from './game.service';

describe('AuthComponent', () => {
  let gameServiceMock: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    loginWithGoogle: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    gameServiceMock = {
      login: vi.fn().mockResolvedValue(null),
      register: vi.fn().mockResolvedValue(null),
      loginWithGoogle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [{ provide: GameService, useValue: gameServiceMock }],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(AuthComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('creates the component in login mode', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
    expect(component.isLoginMode()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('');
  });

  it('shows the login submit label by default', () => {
    const fixture = create();
    const button = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Entrar');
  });

  it('toggleMode switches between login and register and clears messages', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.error.set('boom');
    component.success.set('yay');

    component.toggleMode();
    expect(component.isLoginMode()).toBe(false);
    expect(component.error()).toBe('');
    expect(component.success()).toBe('');

    component.toggleMode();
    expect(component.isLoginMode()).toBe(true);
  });

  it('updates the submit label when switching to register mode', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.toggleMode();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Crear Cuenta');
  });

  it('does nothing on submit when email or password are empty', async () => {
    const fixture = create();
    const component = fixture.componentInstance;

    await component.onSubmit('login');

    expect(gameServiceMock.login).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('logs in successfully', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.email = 'player@test.com';
    component.password = 'secret1';

    await component.onSubmit('login');

    expect(gameServiceMock.login).toHaveBeenCalledWith('player@test.com', 'secret1');
    expect(component.error()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('shows the error message when login fails', async () => {
    gameServiceMock.login.mockResolvedValue({ message: 'Credenciales inválidas' });
    const fixture = create();
    const component = fixture.componentInstance;
    component.email = 'player@test.com';
    component.password = 'wrong';

    await component.onSubmit('login');

    expect(component.error()).toBe('Credenciales inválidas');
    expect(component.loading()).toBe(false);
  });

  it('shows a success message and switches to login mode after registering', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.isLoginMode.set(false);
    component.email = 'new@test.com';
    component.password = 'secret1';

    await component.onSubmit('register');

    expect(gameServiceMock.register).toHaveBeenCalledWith('new@test.com', 'secret1');
    expect(component.success()).toContain('Registro exitoso');
    expect(component.isLoginMode()).toBe(true);
    expect(component.error()).toBe('');
  });

  it('shows the error message when register fails', async () => {
    gameServiceMock.register.mockResolvedValue({ message: 'El email ya está registrado' });
    const fixture = create();
    const component = fixture.componentInstance;
    component.email = 'dup@test.com';
    component.password = 'secret1';

    await component.onSubmit('register');

    expect(component.error()).toBe('El email ya está registrado');
    expect(component.success()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('renders the error in the template', async () => {
    gameServiceMock.login.mockResolvedValue({ message: 'fallo' });
    const fixture = create();
    const component = fixture.componentInstance;
    component.email = 'a@b.c';
    component.password = 'secret1';

    await component.onSubmit('login');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.error') as HTMLElement;
    expect(errorEl?.textContent).toContain('fallo');
  });

  it('delegates Google login to the game service', () => {
    const fixture = create();
    fixture.componentInstance.loginWithGoogle();
    expect(gameServiceMock.loginWithGoogle).toHaveBeenCalled();
  });
});
