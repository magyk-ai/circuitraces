import type { RuntimeState } from './types.js';

export type EngineAction =
  | { type: 'SELECT'; cellIds: string[] }
  | { type: 'RESET' };

export type EngineEvent =
  | { type: 'WORD_FOUND'; wordId: string }
  | { type: 'ALREADY_FOUND'; wordId: string }
  | { type: 'INVALID_SELECTION' }
  | { type: 'COMPLETED'; completedAt: number };

export interface EngineEffects {
  events: EngineEvent[];
}

export interface EngineResult {
  state: RuntimeState;
  effects: EngineEffects;
}
