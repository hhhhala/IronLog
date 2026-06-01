import { create } from 'zustand';
import type { TrainingSession, TrainingPhase } from '@/types';

interface TrainingState {
  session: TrainingSession | null;
  elapsedSeconds: number;
  timerInterval: number | null;

  startSession: (session: TrainingSession) => void;
  updateSession: (updates: Partial<TrainingSession>) => void;
  completeSet: (weight: number, reps: number) => void;
  startRest: () => void;
  skipRest: () => void;
  nextExercise: () => void;
  completeSession: () => void;
  reset: () => void;
}

function findNextIncomplete(session: TrainingSession): { exerciseIndex: number; setNumber: number } | null {
  for (let i = session.currentExerciseIndex; i < session.exercises.length; i++) {
    const ex = session.exercises[i];
    const startSet = i === session.currentExerciseIndex ? session.currentSetNumber : 0;
    for (let j = startSet; j < ex.targetSets; j++) {
      if (!ex.sets[j]?.completed) {
        return { exerciseIndex: i, setNumber: j };
      }
    }
  }
  return null;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  session: null,
  elapsedSeconds: 0,
  timerInterval: null,

  startSession: (session) => {
    // Clear any existing interval
    const existing = get().timerInterval;
    if (existing) clearInterval(existing);

    const interval = window.setInterval(() => {
      set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
    }, 1000);

    set({ session: { ...session, startTime: Date.now() }, elapsedSeconds: 0, timerInterval: interval });
  },

  updateSession: (updates) => {
    set((s) => (s.session ? { session: { ...s.session, ...updates } } : {}));
  },

  completeSet: (weight, reps) => {
    const session = get().session;
    if (!session || session.phase === 'completed') return;

    const ex = session.exercises[session.currentExerciseIndex];
    ex.sets[session.currentSetNumber] = { weight, reps, completed: true };

    const next = findNextIncomplete(session);
    if (!next) {
      // All sets done
      set({
        session: {
          ...session,
          phase: 'completed',
          exercises: [...session.exercises],
        },
      });
      return;
    }

    // Move to rest phase
    set({
      session: {
        ...session,
        exercises: [...session.exercises],
        phase: 'resting',
        currentExerciseIndex: next.exerciseIndex,
        currentSetNumber: next.setNumber,
        restStartTime: Date.now(),
        restDuration: ex.restTime,
      },
    });
  },

  startRest: () => {
    set((s) => {
      if (!s.session) return s;
      return {
        session: {
          ...s.session,
          phase: 'resting',
          restStartTime: Date.now(),
          restDuration: s.session.exercises[s.session.currentExerciseIndex]?.restTime || 90,
        },
      };
    });
  },

  skipRest: () => {
    set((s) => {
      if (!s.session) return s;
      return {
        session: {
          ...s.session,
          phase: 'exercising',
          restStartTime: null,
        },
      };
    });
  },

  nextExercise: () => {
    set((s) => {
      if (!s.session) return s;
      const next = findNextIncomplete(s.session);
      if (!next) {
        return { session: { ...s.session, phase: 'completed' as TrainingPhase } };
      }
      return {
        session: {
          ...s.session,
          phase: 'exercising',
          currentExerciseIndex: next.exerciseIndex,
          currentSetNumber: next.setNumber,
          restStartTime: null,
        },
      };
    });
  },

  completeSession: () => {
    const interval = get().timerInterval;
    if (interval) clearInterval(interval);
    set((s) => ({
      session: s.session ? { ...s.session, phase: 'completed' } : null,
      timerInterval: null,
    }));
  },

  reset: () => {
    const interval = get().timerInterval;
    if (interval) clearInterval(interval);
    set({ session: null, elapsedSeconds: 0, timerInterval: null });
  },
}));
