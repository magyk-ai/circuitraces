import { useState, useEffect } from 'react';
import type { DailySchedule, DailyPuzzleEntry } from '../types/content';

/**
 * Hook to load daily puzzle schedule and resolve today's puzzle
 * 
 * Behavior:
 * 1. Query param override: ?daily=YYYY-MM-DD
 * 2. If not set: load by today's date (UTC timezone)
 * 3. If no match: fallback to latest date in schedule
 */
export function useDailyPuzzle(dateOverride?: string) {
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [todaysPuzzle, setTodaysPuzzle] = useState<DailyPuzzleEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setLoading(true);
        const response = await fetch('/daily/index.json');
        if (!response.ok) {
          throw new Error(`Failed to load daily schedule: ${response.statusText}`);
        }
        const data: DailySchedule = await response.json();
        setSchedule(data);

        // Determine which puzzle to load
        let targetDate = dateOverride;
        if (!targetDate) {
          // Use today's date in UTC
          const now = new Date();
          const year = now.getUTCFullYear();
          const month = String(now.getUTCMonth() + 1).padStart(2, '0');
          const day = String(now.getUTCDate()).padStart(2, '0');
          targetDate = `${year}-${month}-${day}`;
        }

        // Find puzzle for target date
        let puzzle = data.schedule.find(p => p.date === targetDate);

        // Fallback to latest if no match
        if (!puzzle && data.schedule.length > 0) {
          const sorted = [...data.schedule].sort((a, b) => b.date.localeCompare(a.date));
          puzzle = sorted[0];
          console.warn(`No puzzle found for ${targetDate}, using latest: ${puzzle.date}`);
        }

        setTodaysPuzzle(puzzle || null);
        setError(null);
      } catch (err) {
        console.error('Error loading daily schedule:', err);
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [dateOverride]);

  return { schedule, todaysPuzzle, loading, error };
}
