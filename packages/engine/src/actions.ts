import type { RuntimeState } from './types.js';

export type EngineAction =
  | { type: 'SELECT'; cellIds: string[] }
  | { type: 'PRESS_HINT' }
  | { type: 'TICK'; now: number }
  | { type: 'RESET' };

export type EngineEvent =
  | { type: 'WORD_FOUND'; wordId: string; category: 'PATH' | 'ADDITIONAL' }
  | { type: 'ALREADY_FOUND'; wordId: string }
  | { type: 'INVALID_SELECTION' }
  | { type: 'CLUE_APPLIED'; cellId: string }
  | { type: 'HINT_APPLIED'; cellId: string }
  | { type: 'COMPLETED'; completedAt: number };

export interface EngineEffects {
  events: EngineEvent[];
}

export interface EngineResult {
  state: RuntimeState;
  effects: EngineEffects;
}
