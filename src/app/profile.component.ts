import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from './game.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <!-- Header -->
      <header class="profile-header">
        <button class="profile-back-btn" (click)="goBack()">
          ← Volver al juego
        </button>
        <h1 class="profile-title">🌟 Mi Progreso</h1>
        <span class="profile-email">{{ gameService.session()?.email || 'Jugador' }}</span>
      </header>

      <!-- Loading -->
      @if (loading()) {
        <div class="profile-loading">
          <div class="bouncing-emoji">📊</div>
          <p>Cargando tus estadísticas...</p>
          <div class="loading-dots">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      }

      <!-- Error -->
      @if (!loading() && error()) {
        <div class="profile-error">
          <div class="error-emoji">😅</div>
          <h2>¡Ups!</h2>
          <p>{{ error() }}</p>
          <button class="btn-retry" (click)="loadStats()">Intentar de nuevo</button>
        </div>
      }

      <!-- Empty (no data yet) -->
      @if (!loading() && !error() && !hasData()) {
        <div class="profile-empty">
          <div class="empty-emoji">🎮</div>
          <h2>¡Bienvenido a tu perfil!</h2>
          <p>Aquí verás tus estadísticas cuando empieces a jugar. ¡Cada operación que resuelvas aparecerá en tus gráficos!</p>
          <div class="empty-points">
            <span class="empty-points-label">Llevas</span>
            <span class="empty-points-value">{{ gameService.points() }}</span>
            <span class="empty-points-label">puntos</span>
          </div>
          <button class="btn-play" (click)="goBack()">🎯 ¡Ir a jugar!</button>
        </div>
      }

      <!-- Data -->
      @if (!loading() && !error() && hasData()) {
      <div class="profile-content">

        <!-- Star Hero -->
        <section class="points-hero">
          <div class="star-wrapper">
            <svg class="hero-star" viewBox="0 0 100 100" width="90" height="90">
              <defs>
                <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFD700" />
                  <stop offset="100%" stop-color="#FFA000" />
                </linearGradient>
                <filter id="starGlow">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#FFD700" flood-opacity="0.6" />
                </filter>
              </defs>
              <polygon
                points="50,5 63,38 98,38 70,60 79,95 50,75 21,95 30,60 2,38 37,38"
                fill="url(#starGrad)"
                stroke="#FF8F00"
                stroke-width="1.5"
                filter="url(#starGlow)" />
            </svg>
            <span class="sparkle s1">✦</span>
            <span class="sparkle s2">✧</span>
            <span class="sparkle s3">✦</span>
            <span class="sparkle s4">✧</span>
          </div>
          <div class="hero-points">{{ gameService.points() }}</div>
          <div class="hero-label">puntos totales</div>
        </section>

        <!-- Stats Grid -->
        <section class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🧮</div>
            <div class="stat-value">{{ totalOps() }}</div>
            <div class="stat-label">operaciones</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">{{ speedEmoji() }}</div>
            <div class="stat-value">{{ formatTime(avgSpeedMs()) }}</div>
            <div class="stat-label">{{ speedText() }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-value">{{ formatTime(bestTimeMs()) }}</div>
            <div class="stat-label">mejor tiempo</div>
          </div>
        </section>

        <!-- Activity Bar Chart -->
        <section class="chart-section">
          <h2 class="section-title">📅 Actividad diaria</h2>
          @if (dailyOps().length > 0) {
          <div class="bar-chart-wrapper">
            <div class="bar-chart">
              @for (day of dailyOps(); track trackByDate($index, day); let idx = $index) {
              <div class="bar-item">
                <div class="bar-value">{{ day.count }}</div>
                <div class="bar-fill"
                  [style.height.%]="maxDaily() > 0 ? (day.count / maxDaily()) * 100 : 0"
                  [style.background]="barColor(idx)">
                </div>
                <span class="bar-label">{{ formatDayLabel(day.date) }}</span>
              </div>
              }
            </div>
          </div>
          }
          @if (dailyOps().length === 1) {
          <p class="chart-hint">¡Tu primer día! Sigue jugando para ver más barras.</p>
          }
        </section>

        <!-- Speed Gauge -->
        <section class="gauge-section">
          <h2 class="section-title">⚡ Tu velocidad</h2>
          <div class="speed-gauge">
            <div class="speed-animals">
              <span>🐢</span>
              <span>🐇</span>
              <span>🚀</span>
            </div>
            <div class="speed-track">
              <div class="speed-gradient"></div>
              <div class="speed-pointer" [style.left.%]="speedPercent()">🔽</div>
            </div>
            <div class="speed-stats">
              <span class="speed-avg">{{ formatTime(avgSpeedMs()) }}</span>
              <span class="speed-desc">de media por operación</span>
            </div>
          </div>
        </section>

        <!-- Fun fact -->
        <div class="fun-fact">
          <span class="fun-emoji">{{ funEmoji() }}</span>
          <span>{{ funFact() }}</span>
        </div>

      </div>
    }
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 520px;
      margin: 20px auto;
      padding: 0 16px;
      animation: fadeSlideIn 0.4s ease-out;
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .profile-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .profile-back-btn {
      display: block;
      margin: 0 auto 12px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.12);
      color: #ccc;
      padding: 8px 20px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      transition: all 0.2s;
    }
    .profile-back-btn:hover {
      background: rgba(255,255,255,0.14);
      color: #fff;
    }
    .profile-title {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #fff;
      margin: 0 0 4px;
    }
    .profile-email {
      font-size: 13px;
      color: #888;
    }

    /* Loading */
    .profile-loading {
      text-align: center;
      padding: 60px 20px;
      color: #aaa;
    }
    .bouncing-emoji {
      font-size: 48px;
      animation: bounce 0.7s ease-in-out infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-16px); }
    }
    .loading-dots { margin-top: 16px; display: flex; justify-content: center; gap: 8px; }
    .dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: #888;
      animation: dotPulse 1.2s ease-in-out infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dotPulse {
      0%, 100% { transform: scale(0.6); opacity: 0.4; }
      50% { transform: scale(1.2); opacity: 1; }
    }

    /* Error */
    .profile-error {
      text-align: center;
      padding: 40px 20px;
      color: #ccc;
    }
    .error-emoji { font-size: 56px; margin-bottom: 8px; }
    .profile-error h2 { color: #fff; font-family: 'Outfit', sans-serif; }
    .btn-retry {
      margin-top: 12px;
      background: #6366f1;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 15px;
      font-family: 'Inter', sans-serif;
      transition: background 0.2s;
    }
    .btn-retry:hover { background: #4f46e5; }

    /* Empty */
    .profile-empty {
      text-align: center;
      padding: 30px 20px;
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      color: #ccc;
    }
    .empty-emoji { font-size: 64px; margin-bottom: 8px; }
    .profile-empty h2 {
      font-family: 'Outfit', sans-serif;
      color: #fff;
      font-size: 22px;
      margin: 0 0 8px;
    }
    .profile-empty p {
      font-size: 15px;
      line-height: 1.5;
      max-width: 360px;
      margin: 0 auto 16px;
      color: #999;
    }
    .empty-points {
      margin-bottom: 20px;
    }
    .empty-points-label {
      font-size: 16px;
      color: #aaa;
    }
    .empty-points-value {
      font-family: 'Outfit', sans-serif;
      font-size: 36px;
      font-weight: 800;
      color: #FFD700;
      margin: 0 8px;
      vertical-align: middle;
    }
    .btn-play {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 24px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 15px rgba(99,102,241,0.3);
    }
    .btn-play:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99,102,241,0.45);
    }

    /* Points Hero */
    .points-hero {
      text-align: center;
      padding: 24px 20px;
      margin-bottom: 20px;
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      position: relative;
      overflow: hidden;
    }
    .star-wrapper {
      position: relative;
      display: inline-block;
      margin-bottom: 8px;
    }
    .hero-star {
      animation: starPulse 2.5s ease-in-out infinite;
    }
    @keyframes starPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    .sparkle {
      position: absolute;
      color: #FFD700;
      font-size: 14px;
      animation: sparkleFloat 2s ease-in-out infinite;
      pointer-events: none;
    }
    .s1 { top: -8px; right: -8px; animation-delay: 0s; }
    .s2 { bottom: -4px; left: -10px; animation-delay: 0.6s; }
    .s3 { top: 10px; left: -14px; animation-delay: 1.2s; }
    .s4 { bottom: 4px; right: -10px; animation-delay: 1.8s; }
    @keyframes sparkleFloat {
      0%, 100% { opacity: 0.3; transform: scale(0.7); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    .hero-points {
      font-family: 'Outfit', sans-serif;
      font-size: 48px;
      font-weight: 900;
      color: #FFD700;
      line-height: 1.1;
      text-shadow: 0 2px 12px rgba(255,215,0,0.3);
    }
    .hero-label {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      padding: 18px 8px;
      text-align: center;
      animation: fadeSlideIn 0.4s ease-out forwards;
      opacity: 0;
    }
    .stat-card:nth-child(1) { animation-delay: 0.1s; }
    .stat-card:nth-child(2) { animation-delay: 0.2s; }
    .stat-card:nth-child(3) { animation-delay: 0.3s; }
    .stat-icon { font-size: 28px; margin-bottom: 6px; }
    .stat-value {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }
    .stat-label {
      font-size: 12px;
      color: #888;
      margin-top: 2px;
    }

    /* Chart Section */
    .chart-section {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .section-title {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #ddd;
      margin: 0 0 16px;
    }
    .bar-chart-wrapper {
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .bar-chart {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 12px;
      min-height: 160px;
      padding: 0 4px;
    }
    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 44px;
    }
    .bar-value {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #ccc;
      min-height: 20px;
    }
    .bar-fill {
      width: 36px;
      min-height: 4px;
      border-radius: 8px 8px 0 0;
      transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      animation: growUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes growUp {
      from { height: 0 !important; }
    }
    .bar-label {
      font-size: 11px;
      color: #777;
      font-weight: 600;
      margin-top: 2px;
    }
    .chart-hint {
      text-align: center;
      color: #777;
      font-size: 13px;
      margin-top: 12px;
      font-style: italic;
    }

    /* Speed Gauge */
    .gauge-section {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .speed-gauge {
      padding: 0 4px;
    }
    .speed-animals {
      display: flex;
      justify-content: space-between;
      font-size: 22px;
      margin-bottom: 8px;
      padding: 0 4px;
    }
    .speed-track {
      position: relative;
      height: 20px;
      margin-bottom: 12px;
    }
    .speed-gradient {
      width: 100%;
      height: 12px;
      border-radius: 6px;
      background: linear-gradient(to right, #ef4444, #f59e0b 30%, #eab308 60%, #84cc16 80%, #22c55e);
      position: absolute;
      top: 4px;
    }
    .speed-pointer {
      position: absolute;
      top: -4px;
      font-size: 18px;
      transform: translateX(-50%);
      transition: left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
    }
    .speed-stats {
      text-align: center;
    }
    .speed-avg {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      color: #fff;
      display: block;
    }
    .speed-desc {
      font-size: 12px;
      color: #777;
    }

    /* Fun Fact */
    .fun-fact {
      text-align: center;
      padding: 16px 20px;
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      color: #bbb;
      font-size: 14px;
    }
    .fun-emoji {
      font-size: 24px;
      display: block;
      margin-bottom: 4px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .profile-container { padding: 0 10px; }
      .profile-title { font-size: 24px; }
      .hero-points { font-size: 40px; }
      .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .stat-value { font-size: 18px; }
      .bar-chart { gap: 8px; }
      .bar-item { min-width: 36px; }
      .bar-fill { width: 28px; }
    }
  `]
})
export class ProfileComponent {
  gameService = inject(GameService);

  @Output() back = new EventEmitter<void>();

  loading = signal(true);
  error = signal<string | null>(null);
  totalOps = signal(0);
  avgSpeedMs = signal(0);
  bestTimeMs = signal(0);
  dailyOps = signal<{ date: string; count: number }[]>([]);

  maxDaily = computed(() => {
    const ops = this.dailyOps();
    if (ops.length === 0) return 0;
    return Math.max(...ops.map(d => d.count));
  });

  hasData = computed(() => this.totalOps() > 0);

  constructor() {
    this.loadStats();
  }

  async loadStats() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const uid = this.gameService.userId();
      if (!uid) throw new Error('Usuario no autenticado');

      const { data, error: queryError } = await this.gameService.fetchOperationHistory();

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        this.totalOps.set(0);
        this.avgSpeedMs.set(0);
        this.bestTimeMs.set(0);
        this.dailyOps.set([]);
        return;
      }

      const dailyMap = new Map<string, number>();
      let totalTime = 0;
      let best = Infinity;

      for (const entry of data) {
        const d = new Date(entry.created_at).toISOString().split('T')[0];
        dailyMap.set(d, (dailyMap.get(d) || 0) + 1);
        totalTime += entry.time_taken_ms;
        if (entry.time_taken_ms < best) best = entry.time_taken_ms;
      }

      const sorted = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      this.dailyOps.set(sorted);
      this.totalOps.set(data.length);
      this.avgSpeedMs.set(data.length > 0 ? Math.round(totalTime / data.length) : 0);
      this.bestTimeMs.set(best === Infinity ? 0 : best);

    } catch (err: any) {
      this.error.set(err?.message || 'No pudimos cargar tus estadísticas. Revisa tu conexión.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    this.back.emit();
  }

  formatTime(ms: number): string {
    if (ms === 0) return '--';
    if (ms < 1000) return '< 1s';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  speedEmoji(): string {
    const ms = this.avgSpeedMs();
    if (ms === 0) return '⏱️';
    if (ms < 5000) return '🚀';
    if (ms < 15000) return '🐇';
    return '🐢';
  }

  speedText(): string {
    const ms = this.avgSpeedMs();
    if (ms === 0) return 'por operación';
    if (ms < 5000) return '¡muy rápido!';
    if (ms < 15000) return 'buen ritmo';
    return 'con calma';
  }

  speedPercent(): number {
    const ms = this.avgSpeedMs();
    if (ms === 0) return 0;
    const capped = Math.min(ms, 30000);
    const pct = 100 - (capped / 30000) * 100;
    return Math.max(3, Math.min(97, pct));
  }

  formatDayLabel(isoDate: string): string {
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const d = new Date(isoDate + 'T00:00:00');
    return days[d.getDay()];
  }

  barColor(index: number): string {
    const colors = [
      'linear-gradient(to top, #ef4444, #f87171)',
      'linear-gradient(to top, #f59e0b, #fbbf24)',
      'linear-gradient(to top, #eab308, #fde047)',
      'linear-gradient(to top, #22c55e, #4ade80)',
      'linear-gradient(to top, #6366f1, #818cf8)',
    ];
    return colors[index % colors.length];
  }

  trackByDate(_: number, item: { date: string }): string {
    return item.date;
  }

  funEmoji(): string {
    const ops = this.totalOps();
    if (ops >= 100) return '🏅';
    if (ops >= 50) return '🌟';
    if (ops >= 20) return '🎯';
    if (ops >= 10) return '💪';
    if (ops >= 5) return '👏';
    return '🌱';
  }

  funFact(): string {
    const ops = this.totalOps();
    const pts = this.gameService.points();
    if (ops === 0) return '¡Cada gran viaje empieza con un primer paso!';
    if (ops >= 100) return `¡Eres un campeón! ¡${ops} operaciones resueltas! ¿Puedes llegar a ${ops + 50}?`;
    if (ops >= 50) return `¡Increíble! Has resuelto ${ops} operaciones. ¡Sigue así!`;
    if (ops >= 20) return `¡${ops} operaciones! ¡Ya eres todo un experto en sumas!`;
    if (ops >= 10) return `¡Vas muy bien! ${ops} operaciones y ${pts} puntos.`;
    if (ops >= 5) return `¡Estás arrancando! ${ops} operaciones completadas.`;
    return `¡Tu primera operación! ¡A por más!`;
  }
}