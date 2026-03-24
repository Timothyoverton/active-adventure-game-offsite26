// Core game models and interfaces

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum AccountantType {
  PREPARER = 'preparer',
  REVIEWER = 'reviewer',
  MANAGER = 'manager',
  PARTNER = 'partner'
}

export interface AccountantAbility {
  name: string;
  description: string;
  cooldown: number; // milliseconds
  duration?: number; // milliseconds (for temporary effects)
}

export interface Player {
  type: AccountantType;
  position: Position;
  velocity: Velocity;
  size: Size;
  isJumping: boolean;
  isFalling: boolean;
  facingRight: boolean;
  health: number; // Compliance meter (0-100)
  maxHealth: number;
  score: number;
  jumpsRemaining: number; // For double jump
  maxJumps: number; // 1 for normal, 2 for reviewer
  ability: AccountantAbility;
  abilityActive: boolean;
  abilityCooldownRemaining: number;
  invulnerable: boolean; // For brief invulnerability after hit
  invulnerabilityTimer: number;
}

export enum EnemyType {
  LAPTOP = 'laptop',
  FILING_CABINET = 'filing_cabinet',
  STRESSED_COLLEAGUE = 'stressed_colleague',
  PRINTER_JAM = 'printer_jam',
  AUDIT_ALERT = 'audit_alert'
}

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Position;
  velocity: Velocity;
  size: Size;
  damage: number; // How much compliance meter it drains
  isAlive: boolean;
  animationFrame: number;
}

export enum CollectibleType {
  COFFEE = 'coffee',
  FINANCIAL_DOCUMENT = 'financial_document',
  CALCULATOR = 'calculator',
  ENERGY_DRINK = 'energy_drink',
  COMPLIANCE_MANUAL = 'compliance_manual'
}

export interface Collectible {
  id: string;
  type: CollectibleType;
  position: Position;
  size: Size;
  healthRestore: number; // How much compliance meter it restores
  pointValue: number;
  isCollected: boolean;
}

export interface Projectile {
  id: string;
  type: 'stapler';
  position: Position;
  velocity: Velocity;
  size: Size;
  damage: number;
  isActive: boolean;
  ownerId: string; // Player identifier
}

export interface Platform {
  id: string;
  position: Position;
  size: Size;
  type: 'desk' | 'floor' | 'filing_cabinet';
}

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  highScore: number;
  level: number;
  distanceTraveled: number;
  player: Player | null;
  enemies: Enemy[];
  collectibles: Collectible[];
  projectiles: Projectile[];
  platforms: Platform[];
  selectedCharacter: AccountantType | null;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  gravity: number;
  playerSpeed: number;
  jumpForce: number;
  scrollSpeed: number;
  fps: number;
}

// Accountant type configurations
export const ACCOUNTANT_CONFIGS: Record<AccountantType, {
  ability: AccountantAbility;
  maxJumps: number;
  speed: number;
  color: string;
  description: string;
}> = {
  [AccountantType.PREPARER]: {
    ability: {
      name: 'Rapid Fire',
      description: 'Throw staplers 3x faster for 5 seconds',
      cooldown: 10000,
      duration: 5000
    },
    maxJumps: 1,
    speed: 1.0,
    color: '#4A90E2',
    description: 'Fast stapler throws'
  },
  [AccountantType.REVIEWER]: {
    ability: {
      name: 'Double Jump',
      description: 'Jump twice in the air',
      cooldown: 0, // Always available
      duration: 0
    },
    maxJumps: 2,
    speed: 1.0,
    color: '#50C878',
    description: 'Can double jump'
  },
  [AccountantType.MANAGER]: {
    ability: {
      name: 'Multi-Stapler',
      description: 'Throw 3 staplers at once',
      cooldown: 8000,
      duration: 0
    },
    maxJumps: 1,
    speed: 0.9,
    color: '#E74C3C',
    description: 'Triple stapler throw'
  },
  [AccountantType.PARTNER]: {
    ability: {
      name: 'Compliance Shield',
      description: 'Become invulnerable for 4 seconds',
      cooldown: 15000,
      duration: 4000
    },
    maxJumps: 1,
    speed: 1.1,
    color: '#9B59B6',
    description: 'Temporary invincibility'
  }
};

// Enemy configurations
export const ENEMY_CONFIGS: Record<EnemyType, {
  size: Size;
  damage: number;
  speed: number;
  points: number;
}> = {
  [EnemyType.LAPTOP]: {
    size: { width: 40, height: 30 },
    damage: 15,
    speed: 0,
    points: 50
  },
  [EnemyType.FILING_CABINET]: {
    size: { width: 50, height: 60 },
    damage: 25,
    speed: 0,
    points: 100
  },
  [EnemyType.STRESSED_COLLEAGUE]: {
    size: { width: 35, height: 50 },
    damage: 20,
    speed: 1.5,
    points: 150
  },
  [EnemyType.PRINTER_JAM]: {
    size: { width: 45, height: 40 },
    damage: 30,
    speed: 0,
    points: 200
  },
  [EnemyType.AUDIT_ALERT]: {
    size: { width: 60, height: 60 },
    damage: 40,
    speed: 2.5,
    points: 300
  }
};

// Collectible configurations
export const COLLECTIBLE_CONFIGS: Record<CollectibleType, {
  size: Size;
  healthRestore: number;
  points: number;
}> = {
  [CollectibleType.COFFEE]: {
    size: { width: 20, height: 25 },
    healthRestore: 10,
    points: 25
  },
  [CollectibleType.FINANCIAL_DOCUMENT]: {
    size: { width: 25, height: 30 },
    healthRestore: 15,
    points: 50
  },
  [CollectibleType.CALCULATOR]: {
    size: { width: 20, height: 20 },
    healthRestore: 20,
    points: 75
  },
  [CollectibleType.ENERGY_DRINK]: {
    size: { width: 18, height: 30 },
    healthRestore: 25,
    points: 100
  },
  [CollectibleType.COMPLIANCE_MANUAL]: {
    size: { width: 30, height: 35 },
    healthRestore: 50,
    points: 200
  }
};
