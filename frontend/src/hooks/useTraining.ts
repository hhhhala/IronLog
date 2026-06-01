import { useCallback } from 'react';
import { useTrainingStore } from '@/stores/training-store';
import { usePlanStore } from '@/stores/plan-store';
import type { TrainingSession, TrainingRecord, RecordExercise } from '@/types';
import { db, saveRecord } from '@/db/local-db';
import { estimateCalories } from '@/utils/calories';
import { calculateGrowthPoints } from '@/utils/growth';
import { useUserStore } from '@/stores/user-store';
import { todayStr, calculateStreak } from '@/utils/streak';

export function useTraining() {
  const { session, elapsedSeconds, startSession, completeSet, startRest, skipRest, completeSession, reset } =
    useTrainingStore();
  const { activePlan } = usePlanStore();
  const { user } = useUserStore();

  const initTraining = useCallback(
    (planId: number, dayNumber: number) => {
      const plan = usePlanStore.getState().plans.find((p) => p.id === planId);
      if (!plan) return;

      const dayExercises = (plan.exercises || [])
        .filter((e) => e.dayNumber === dayNumber)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const session: TrainingSession = {
        planId,
        dayNumber,
        startTime: Date.now(),
        exercises: dayExercises.map((ex) => ({
          name: ex.exerciseName,
          targetSets: ex.sets,
          targetReps: ex.reps,
          targetWeight: ex.targetWeight,
          restTime: ex.restTime,
          sets: Array.from({ length: ex.sets }, () => ({ weight: 0, reps: 0, completed: false })),
        })),
        currentExerciseIndex: 0,
        currentSetNumber: 0,
        phase: 'exercising',
        restStartTime: null,
        restDuration: 90,
      };

      startSession(session);
    },
    [startSession]
  );

  const logSet = useCallback(
    (weight: number, reps: number) => {
      completeSet(weight, reps);
    },
    [completeSet]
  );

  const finishWorkout = useCallback(async () => {
    const s = useTrainingStore.getState();
    if (!s.session || !user) return;

    completeSession();

    const totalSets = s.session.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
      0
    );
    const totalReps = s.session.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).reduce((a, s) => a + s.reps, 0),
      0
    );
    const totalVolume = s.session.exercises.reduce(
      (sum, ex) =>
        sum + ex.sets.filter((s) => s.completed).reduce((a, s) => a + s.weight * s.reps, 0),
      0
    );

    const recordExercises: RecordExercise[] = [];
    s.session.exercises.forEach((ex) => {
      ex.sets.forEach((set, i) => {
        if (set.completed) {
          recordExercises.push({
            exerciseName: ex.name,
            setNumber: i + 1,
            weight: set.weight,
            reps: set.reps,
            isPR: false, // Will be checked below
          });
        }
      });
    });

    const allRecords = await db.records.toArray();
    const allRecordExercises = await db.recordExercises.toArray();
    const prevRecords = allRecords.map((r) => ({
      ...r,
      exercises: allRecordExercises.filter((re) => re.recordId === r.id),
    }));

    // Mark PRs
    recordExercises.forEach((ex) => {
      ex.isPR = checkPR(ex.exerciseName, ex.weight, ex.reps, prevRecords);
    });

    const { currentStreak } = calculateStreak(allRecords);

    const record: TrainingRecord = {
      userId: user.id,
      planId: s.session.planId,
      date: todayStr(),
      totalDuration: s.elapsedSeconds,
      totalSets,
      totalReps,
      totalVolume,
      estimatedCalories: estimateCalories(user.weight, s.elapsedSeconds),
      growthPoints: calculateGrowthPoints(
        { exercises: recordExercises } as TrainingRecord,
        prevRecords,
        currentStreak
      ).points,
      exercises: recordExercises,
      notes: '',
    };

    const recordId = await saveRecord(record);

    // Log growth
    await db.growthLogs.add({
      userId: user.id,
      date: todayStr(),
      points: record.growthPoints,
      reason: '训练完成',
      relatedRecordId: recordId,
    });

    return recordId;
  }, [completeSession, user]);

  return {
    session,
    elapsedSeconds,
    initTraining,
    logSet,
    finishWorkout,
    startRest,
    skipRest,
    reset,
  };
}

function checkPR(
  exerciseName: string,
  weight: number,
  reps: number,
  prevRecords: TrainingRecord[]
): boolean {
  for (const record of prevRecords) {
    for (const ex of record.exercises || []) {
      if (ex.exerciseName === exerciseName) {
        if (weight > ex.weight || (weight === ex.weight && reps > ex.reps)) {
          return true;
        }
        return false;
      }
    }
  }
  return weight > 0; // First time = PR
}
