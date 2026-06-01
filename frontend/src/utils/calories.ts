// Utility: Calorie Estimation
// Based on MET (Metabolic Equivalent of Task) values and body weight

const MET_VALUES: Record<string, number> = {
  default: 6.0,
  strength: 6.0,
  bodyweight: 5.5,
  cardio: 8.0,
};

/**
 * Estimate calories burned during a workout.
 * Formula: calories = MET × weight(kg) × duration(hours)
 */
export function estimateCalories(
  weightKg: number,
  durationSeconds: number,
  exerciseType: string = 'strength'
): number {
  const met = MET_VALUES[exerciseType] || MET_VALUES.default;
  const durationHours = durationSeconds / 3600;
  const calories = met * weightKg * durationHours;
  return Math.round(calories);
}
