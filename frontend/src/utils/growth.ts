// Utility: Growth Points Calculation
import type { TrainingRecord } from '@/types';

/**
 * Calculate growth points for a training session.
 * Rules:
 * - Base: +100 for completing a workout
 * - Streak: +50 for consecutive 3+ days
 * - PR: +30 for each personal record
 */
export function calculateGrowthPoints(
  record: TrainingRecord,
  previousRecords: TrainingRecord[],
  streakDays: number
): { points: number; reasons: string[] } {
  let points = 100;
  const reasons: string[] = ['训练完成'];

  if (streakDays >= 3) {
    points += 50;
    reasons.push('连续打卡奖励');
  }

  // Check for PRs
  for (const ex of (record.exercises || [])) {
    if (ex.isPR) {
      points += 30;
      reasons.push(`${ex.exerciseName} PR刷新`);
    }
  }

  return { points, reasons };
}

/**
 * Check if a set is a new personal record
 */
export function isPersonalRecord(
  exerciseName: string,
  weight: number,
  reps: number,
  previousRecords: TrainingRecord[]
): boolean {
  let isPR = false;

  for (const record of previousRecords) {
    for (const ex of (record.exercises || [])) {
      if (ex.exerciseName === exerciseName) {
        // PR if heavier weight or more reps at same weight
        if (weight > ex.weight || (weight === ex.weight && reps > ex.reps)) {
          isPR = true;
        }
      }
    }
  }

  // Also PR if no previous record of this exercise
  const hasPrevious = previousRecords.some((r) =>
    (r.exercises || []).some((e) => e.exerciseName === exerciseName)
  );
  if (!hasPrevious && weight > 0) {
    isPR = true;
  }

  return isPR;
}
