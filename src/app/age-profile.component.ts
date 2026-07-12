import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from './game.service';

@Component({
  selector: 'app-age-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="age-container">
      <h2>¡Ya casi estamos!</h2>
      <p>Para adaptar la dificultad del juego, por favor indica la edad del niño que va a jugar:</p>
      
      <div class="input-group">
        <input type="number" [(ngModel)]="age" min="4" max="99" placeholder="Ej: 7">
      </div>
      
      <div class="info-box">
        <small>💡 Si tiene menos de 8 años, comenzará en el Nivel 1. Si tiene 8 o más, comenzará en el Nivel 2.</small>
      </div>

      <button (click)="saveAge()" [disabled]="!age || loading()" class="btn-primary">Guardar y Jugar</button>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>
  `,
  styles: [`
    .age-container { 
      max-width: 400px; margin: 60px auto; padding: 30px; 
      text-align: center; border-radius: 12px; 
      background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    h2 { color: #333; margin-top: 0; }
    p { color: #666; font-size: 16px; margin-bottom: 20px; }
    .input-group { margin-bottom: 20px; }
    input { 
      padding: 15px; font-size: 24px; width: 120px; 
      text-align: center; border: 2px solid #ccc; border-radius: 8px;
    }
    .info-box { background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 20px; color: #555; text-align: left;}
    .btn-primary { 
      width: 100%; padding: 12px; font-size: 16px; 
      cursor: pointer; background: #0066cc; color: white; 
      border: none; border-radius: 6px; font-weight: bold;
    }
    .btn-primary:disabled { background: #999; }
    .error { color: #d32f2f; margin-top: 15px; }
  `]
})
export class AgeProfileComponent {
  gameService = inject(GameService);
  age: number | null = null;
  loading = signal(false);
  error = signal('');

  async saveAge() {
    if (!this.age) return;
    this.loading.set(true);
    this.error.set('');
    const err = await this.gameService.saveAge(this.age);
    if (err) {
      this.error.set(err.message);
    }
    this.loading.set(false);
  }
}
