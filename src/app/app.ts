import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from './game.service';
import { AuthComponent } from './auth.component';
import { AgeProfileComponent } from './age-profile.component';
import { ProfileComponent } from './profile.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, AuthComponent, AgeProfileComponent, ProfileComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  gameService = inject(GameService);
  showAgeEditor = signal(false);
  showProfile = signal(false);

  constructor() {
    // Auto-hide age editor when age is successfully saved
    effect(() => {
      if (this.gameService.userAge() !== null) {
        this.showAgeEditor.set(false);
      }
    });
  }

  toggleAgeEditor() {
    this.showAgeEditor.set(!this.showAgeEditor());
  }

  toggleProfile() {
    this.showProfile.set(!this.showProfile());
  }
}
