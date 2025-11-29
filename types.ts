
export enum GamePhase {
  IDLE = 'IDLE',
  FLYING = 'FLYING',
  CRASHED = 'CRASHED',
}

export interface Player {
  id: string;
  name: string;
  betAmount: number;
  cashedOutAt?: number;
  avatar: string;
}

export interface BetHistoryItem {
  multiplier: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'player' | 'system';
  text: string;
  name?: string;
  avatar?: string;
  isRain?: boolean;
  rainAmount?: number;
  claimed?: boolean;
}

export type GameLoopCallback = (multiplier: number) => void;
