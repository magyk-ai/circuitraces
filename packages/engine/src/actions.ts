import type { RuntimeState } from './types.js';

export type EngineAction =
  | { type: 'SELECT'; cellIds: string[] }
  | { type: 'PRESS_HINT' }
  | { type: 'RESET' };
  // Note: TICK removed in v1.1 - timer is UI-only, hints persist indefinitely

export type HintSource = 'BUTTON' | 'BONUS';

export type EngineEvent =
  | { type: 'WORD_FOUND'; wordId: string; category: 'PATH' | 'ADDITIONAL' }
  | { type: 'ALREADY_FOUND'; wordId: string }
  | { type: 'INVALID_SELECTION' }
  | { type: 'HINT_APPLIED'; cellId: string; source: HintSource }
  | { type: 'COMPLETED'; completedAt: number };

export interface EngineEffects {
  events: EngineEvent[];
}

export interface EngineResult {
  state: RuntimeState;
  effects: EngineEffects;
}
