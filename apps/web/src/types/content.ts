/**
 * Content catalog types for daily puzzles and topic libraries
 */

export interface GridSize {
  width: number;
  height: number;
}

export interface DailyPuzzleMetadata {
  id: string; 
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grid: GridSize;
  estimatedMinutes: number;
  puzzlePath: string;
  tags: string[];
}

export interface DailyPuzzleEntry {
  date: string; // YYYY-MM-DD
  puzzles: Record<string, DailyPuzzleMetadata>; // topicId -> metadata
}

export interface DailySchedule {
  version: number;
  contentVersion: string; // e.g., "2026.01.17"
  timezone: string; // "UTC"
  defaultMode: 'DAILY';
  schedule: DailyPuzzleEntry[];
}

export interface TopicInfo {
  topicId: string;
  title: string;
  description: string;
  icon: string; // Short text for icon display
  indexPath: string;
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

export interface TopicMasterIndex {
  version: number;
  topics: TopicInfo[];
}

export interface TopicPuzzleEntry {
  id: string; // e.g., "pm-001"
  revision: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grid: GridSize;
  estimatedMinutes: number;
  tags: string[];
  puzzlePath: string;
  createdAt: string; // YYYY-MM-DD
}

export interface TopicCatalog {
  version: number;
  contentVersion: string;
  topicId: string;
  title: string;
  description: string;
  puzzles: TopicPuzzleEntry[];
}
