import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './components/game/game.component';
import { AccountantType } from './models/game.models';

type Screen = 'start' | 'select' | 'play' | 'gameover';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, GameComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  screen = signal<Screen>('start');
  selectedType = signal<AccountantType>(AccountantType.PREPARER);
  finalScore = signal<number>(0);
  readonly AccountantType = AccountantType;

  readonly characters = [
    {
      type: AccountantType.PREPARER, name: 'The Preparer', color: '#4A90E2',
      emoji: '📊',
      description: 'Fresh out of accounting school. Fuelled by coffee and anxiety.',
      ability: 'Rapid Fire', abilityDesc: 'Throws staplers 3× faster for 5 seconds',
      stats: { speed: 3, jump: 2, power: 4 }
    },
    {
      type: AccountantType.REVIEWER, name: 'The Reviewer', color: '#50C878',
      emoji: '🔍',
      description: 'Methodical and precise. Can jump over any compliance hurdle.',
      ability: 'Double Jump', abilityDesc: 'Always jumps twice + Super Jump ability',
      stats: { speed: 2, jump: 5, power: 2 }
    },
    {
      type: AccountantType.MANAGER, name: 'The Manager', color: '#E74C3C',
      emoji: '💼',
      description: 'Delegates everything. Except throwing staplers, apparently.',
      ability: 'Multi-Stapler', abilityDesc: 'Fires 3 staplers simultaneously for 4s',
      stats: { speed: 2, jump: 2, power: 5 }
    },
    {
      type: AccountantType.PARTNER, name: 'The Partner', color: '#9B59B6',
      emoji: '🏆',
      description: 'Immune to nonsense. Years of audits made them untouchable.',
      ability: 'Compliance Shield', abilityDesc: '4 seconds of full invincibility',
      stats: { speed: 4, jump: 3, power: 3 }
    },
  ];

  goSelect() { this.screen.set('select'); }
  selectChar(type: AccountantType) { this.selectedType.set(type); this.screen.set('play'); }
  onGameOver(score: number) { this.finalScore.set(score); this.screen.set('gameover'); }
  playAgain() { this.screen.set('play'); }
  changeChar() { this.screen.set('select'); }

  stars(n: number): string { return '★'.repeat(n) + '☆'.repeat(5-n); }
}
