/// <reference types="vite/client" />
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
  const [todaysEntry, setTodaysEntry] = useState<DailyPuzzleEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash if present to avoid double slash
        const res = await fetch(`${baseUrl}/daily/index.json?v=${Date.now()}`);
        if (!res.ok) {
          throw new Error(`Failed to load daily schedule: ${res.statusText}`);
        }
        const data: DailySchedule = await res.json();
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

        // Find puzzle entry for target date
        let entry = data.schedule.find(p => p.date === targetDate);

        // Fallback to latest if no match
        if (!entry && data.schedule.length > 0) {
          const sorted = [...data.schedule].sort((a, b) => b.date.localeCompare(a.date));
          entry = sorted[0];
          console.warn(`No puzzle found for ${targetDate}, using latest: ${entry.date}`);
        }

        setTodaysEntry(entry || null);
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

  return { schedule, todaysEntry, loading, error };
}
