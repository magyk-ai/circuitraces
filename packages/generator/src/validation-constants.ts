/**
 * Shared validation constants and threshold functions for puzzle generation and QA.
 * These functions define the constraints for valid puzzles.
 */

/**
 * Get the minimum number of unique path cells required for a puzzle.
 * Based on grid size to ensure adequate path coverage.
 */
export function getCoverageThreshold(width: number, height: number): number {
  if (width === 6 && height === 6) return 10;  // 27.8%
  if (width === 7 && height === 7) return 12;  // 24.5%
  if (width === 8 && height === 8) return 16;  // 25.0%
  if (width === 10 && height === 10) return 25; // 25%
  if (width === 11 && height === 11) return 30; // 24.8%
  if (width === 12 && height === 12) return 20; // 13.9% - reduced for generatability
  return Math.max(8, Math.floor((width * height) / 6));
}

/**
 * Get the minimum number of word intersections required for a puzzle.
 * Ensures path words are interconnected.
 */
export function getMinIntersections(numWords: number): number {
  return Math.max(2, numWords - 2);
}

/**
 * Get the minimum route length (shortest path from START to END).
 * Based on grid height to ensure puzzles aren't trivially short.
 */
export function getMinRouteLength(height: number): number {
  return Math.ceil(height * 0.6);
}
