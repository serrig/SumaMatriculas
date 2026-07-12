import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from './game.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-container">
      <h2>Suma Matrículas</h2>
      <p>Inicia sesión o regístrate para jugar y guardar tus progresos.</p>
      
      <form (ngSubmit)="onSubmit(isLoginMode() ? 'login' : 'register')">
        <div class="form-group">
          <label>Email:</label>
          <input type="email" [(ngModel)]="email" name="email" required placeholder="tu@email.com">
        </div>
        <div class="form-group">
          <label>Contraseña:</label>
          <input type="password" [(ngModel)]="password" name="password" required minlength="6" placeholder="Mínimo 6 caracteres">
        </div>

        <div class="actions">
          <button type="submit" [disabled]="loading()" class="btn-primary">
            {{ isLoginMode() ? 'Entrar' : 'Crear Cuenta' }}
          </button>
        </div>

        <div class="divider">
          <span>o</span>
        </div>

        <button type="button" (click)="loginWithGoogle()" [disabled]="loading()" class="btn-google">
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Iniciar sesión con Google
        </button>

        <div class="toggle-mode">
          <a href="javascript:void(0)" (click)="toggleMode()">
            {{ isLoginMode() ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
          </a>
        </div>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        @if (success()) {
          <p class="success">{{ success() }}</p>
        }
      </form>
    </div>
  `,
  styles: [`
    .auth-container { 
      max-width: 400px; margin: 60px auto; padding: 30px; 
      text-align: center; border-radius: 12px; 
      background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    h2 { color: #333; margin-top: 0; }
    p { color: #666; margin-bottom: 20px; }
    .form-group { margin-bottom: 15px; text-align: left; }
    label { display: block; margin-bottom: 5px; font-weight: bold; color: #444; }
    input { 
      width: 100%; padding: 10px; box-sizing: border-box; 
      border: 1px solid #ccc; border-radius: 6px; font-size: 16px;
    }
    .btn-primary {
      width: 100%; padding: 12px; font-size: 16px;
      cursor: pointer; background: #0066cc; color: white;
      border: none; border-radius: 6px; font-weight: bold; margin-top: 10px;
    }
    .btn-primary:disabled { background: #999; }
    .divider {
      display: flex; align-items: center; margin: 16px 0; color: #999; font-size: 13px;
    }
    .divider::before, .divider::after {
      content: ''; flex: 1; height: 1px; background: #ddd;
    }
    .divider span { margin: 0 12px; }
    .btn-google {
      width: 100%; padding: 10px; font-size: 15px;
      cursor: pointer; background: white; color: #444;
      border: 1px solid #ccc; border-radius: 6px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      transition: background 0.2s;
    }
    .btn-google:hover { background: #f8f8f8; }
    .btn-google:disabled { opacity: 0.6; cursor: default; }
    .google-icon { flex-shrink: 0; }
    .toggle-mode { margin-top: 15px; }
    .toggle-mode a { color: #0066cc; text-decoration: none; font-size: 14px; }
    .error { color: #d32f2f; margin-top: 15px; background: #ffebee; padding: 10px; border-radius: 4px;}
    .success { color: #2e7d32; margin-top: 15px; background: #e8f5e9; padding: 10px; border-radius: 4px;}
  `]
})
export class AuthComponent {
  gameService = inject(GameService);
  email = '';
  password = '';
  isLoginMode = signal(true);
  loading = signal(false);
  error = signal('');
  success = signal('');

  toggleMode() {
    this.isLoginMode.set(!this.isLoginMode());
    this.error.set('');
    this.success.set('');
  }

  loginWithGoogle() {
    this.gameService.loginWithGoogle();
  }

  async onSubmit(action: 'login' | 'register') {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    
    if (action === 'login') {
      const err = await this.gameService.login(this.email, this.password);
      if (err) this.error.set(err.message);
    } else {
      const err = await this.gameService.register(this.email, this.password);
      if (err) {
        this.error.set(err.message);
      } else {
        this.success.set('Registro exitoso. Si no se inicia sesión automáticamente, entra ahora.');
        this.isLoginMode.set(true);
      }
    }
    this.loading.set(false);
  }
}
