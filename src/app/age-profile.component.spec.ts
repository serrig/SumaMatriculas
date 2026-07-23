import { TestBed } from '@angular/core/testing';
import { AgeProfileComponent } from './age-profile.component';
import { GameService } from './game.service';

describe('AgeProfileComponent', () => {
  let gameServiceMock: { saveAge: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    gameServiceMock = { saveAge: vi.fn().mockResolvedValue(null) };

    await TestBed.configureTestingModule({
      imports: [AgeProfileComponent],
      providers: [{ provide: GameService, useValue: gameServiceMock }],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(AgeProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('creates the component', () => {
    const fixture = create();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('keeps the save button disabled until an age is entered', async () => {
    const fixture = create();
    const button = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(button.disabled).toBe(true);

    input.value = '7';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.age).toBe(7);
    expect(button.disabled).toBe(false);
  });

  it('does nothing when saving without an age', async () => {
    const fixture = create();
    const component = fixture.componentInstance;

    await component.saveAge();

    expect(gameServiceMock.saveAge).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('saves the age through the game service', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.age = 6;

    await component.saveAge();

    expect(gameServiceMock.saveAge).toHaveBeenCalledWith(6);
    expect(component.error()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('shows the error message when saving fails', async () => {
    gameServiceMock.saveAge.mockResolvedValue({ message: 'Error al guardar la edad' });
    const fixture = create();
    const component = fixture.componentInstance;
    component.age = 10;

    await component.saveAge();
    fixture.detectChanges();

    expect(component.error()).toBe('Error al guardar la edad');
    expect(component.loading()).toBe(false);

    const errorEl = fixture.nativeElement.querySelector('.error') as HTMLElement;
    expect(errorEl?.textContent).toContain('Error al guardar la edad');
  });

  it('clears a previous error when saving again', async () => {
    gameServiceMock.saveAge
      .mockResolvedValueOnce({ message: 'fallo' })
      .mockResolvedValueOnce(null);
    const fixture = create();
    const component = fixture.componentInstance;
    component.age = 8;

    await component.saveAge();
    expect(component.error()).toBe('fallo');

    await component.saveAge();
    expect(component.error()).toBe('');
  });
});
