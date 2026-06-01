// IronLog Type Definitions

export interface UserProfile {
  id: string;
  nickname: string;
  height: number;       // cm
  weight: number;       // kg
  goal: '增肌' | '减脂' | '力量提升' | '运动表现';
  trainingExperience: '新手' | '半年' | '1年' | '2年+';
  weeklyFrequency: number;
  deepseekApiKey: string;
  timerMode: 'countdown' | 'countup';
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPlan {
  id?: number;
  userId: string;
  name: string;
  goal: string;
  cycleDays: number;
  isActive: boolean;
  exercises?: PlanExercise[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanExercise {
  id?: number;
  planId?: number;
  dayNumber: number;
  exerciseName: string;
  sets: number;
  reps: number;
  targetWeight: number;
  restTime: number;     // seconds
  sortOrder: number;
  notes: string;
}

export interface TrainingRecord {
  id?: number;
  userId: string;
  planId?: number;
  date: string;          // YYYY-MM-DD
  totalDuration: number; // seconds
  totalSets: number;
  totalReps: number;
  totalVolume: number;   // kg
  estimatedCalories: number;
  growthPoints: number;
  exercises?: RecordExercise[];
  notes: string;
  createdAt?: string;
}

export interface RecordExercise {
  id?: number;
  recordId?: number;
  exerciseName: string;
  setNumber: number;
  weight: number;        // kg
  reps: number;
  isPR: boolean;
}

export interface WeightLog {
  id?: number;
  userId: string;
  date: string;
  weight: number;
}

export interface GrowthLog {
  id?: number;
  userId: string;
  date: string;
  points: number;
  reason: string;
  relatedRecordId?: number;
}

// AI Coach types
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  planData?: TrainingPlan | null;
  timestamp: number;
}

// Training session types
export type TrainingPhase = 'idle' | 'exercising' | 'resting' | 'completed';

export interface ActiveSet {
  exerciseIndex: number;
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface TrainingSession {
  planId: number;
  dayNumber: number;
  startTime: number;
  exercises: {
    name: string;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    restTime: number;
    sets: { weight: number; reps: number; completed: boolean }[];
  }[];
  currentExerciseIndex: number;
  currentSetNumber: number;
  phase: TrainingPhase;
  restStartTime: number | null;
  restDuration: number;
}

// Sync types
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncQueueItem {
  id?: number;
  tableName: string;
  recordId: string | number;
  action: 'create' | 'update' | 'delete';
  payload: unknown;
  timestamp: number;
}
