// Utility: Streak Calculation
import type { TrainingRecord } from '@/types';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  todayTrained: boolean;
}

/**
 * Calculate training streak from records.
 * A streak is the number of consecutive days (including today) with training.
 */
export function calculateStreak(records: TrainingRecord[]): StreakInfo {
  if (records.length === 0) {
    return { currentStreak: 0, longestStreak: 0, todayTrained: false };
  }

  // Get unique training dates sorted descending
  const dates = [...new Set(records.map((r) => r.date))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const todayTrained = dates.includes(today);

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(today);

  // If today not trained, start checking from yesterday
  if (!todayTrained) {
    checkDate = new Date(yesterday);
  }

  while (dates.includes(checkDate.toISOString().slice(0, 10))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedDates = [...new Set(dates)].sort();

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return { currentStreak, longestStreak, todayTrained };
}

/**
 * Get the current date string (YYYY-MM-DD)
 */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
