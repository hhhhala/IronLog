import { useSyncStore } from '@/stores/sync-store';
import { db } from '@/db/local-db';

const API_BASE = 'https://ironlog-worker.hhhhala7777777.workers.dev';

/** Upload all local data to cloud (D1) */
export async function pushToCloud(): Promise<void> {
  const { syncNow } = useSyncStore.getState();
  if (!navigator.onLine) {
    useSyncStore.getState().setStatus('offline');
    return;
  }
  await syncNow(API_BASE);
}

/** Download cloud data and merge into local IndexedDB */
export async function pullFromCloud(): Promise<void> {
  if (!navigator.onLine) throw new Error('离线状态，无法下载');

  const res = await fetch(`${API_BASE}/api/sync/pull`);
  if (!res.ok) throw new Error(`下载失败: ${res.status}`);

  const json = await res.json() as {
    success: boolean;
    data?: {
      user?: Record<string, unknown>;
      plans?: Record<string, unknown>[];
      planExercises?: Record<string, unknown>[];
      records?: Record<string, unknown>[];
      recordExercises?: Record<string, unknown>[];
      weightLogs?: Record<string, unknown>[];
      growthLogs?: Record<string, unknown>[];
    };
    error?: string;
  };

  if (!json.success || !json.data) throw new Error(json.error || '下载失败');

  const data = json.data;

  // Helper: map snake_case D1 row to camelCase TS type
  function mapUser(u: Record<string, unknown>) {
    return {
      id: u.id as string,
      nickname: u.nickname as string || '',
      height: u.height as number || 170,
      weight: u.weight as number || 70,
      goal: u.goal as string || '增肌',
      trainingExperience: u.training_experience as string || '新手',
      weeklyFrequency: u.weekly_frequency as number || 3,
      deepseekApiKey: (u.deepseek_api_key as string) || '',
      timerMode: u.timer_mode as string || 'countup',
      createdAt: u.created_at as string || new Date().toISOString(),
      updatedAt: u.updated_at as string || new Date().toISOString(),
    };
  }

  function mapPlan(p: Record<string, unknown>) {
    return {
      id: p.id as number,
      userId: p.user_id as string,
      name: p.name as string || '',
      goal: p.goal as string || '',
      cycleDays: p.cycle_days as number || 3,
      isActive: p.is_active === 1 || p.is_active === true,
      createdAt: p.created_at as string || '',
      updatedAt: p.updated_at as string || '',
    };
  }

  function mapPlanExercise(e: Record<string, unknown>) {
    return {
      id: e.id as number,
      planId: e.plan_id as number,
      dayNumber: e.day_number as number || 1,
      exerciseName: e.exercise_name as string || '',
      sets: e.sets as number || 3,
      reps: e.reps as number || 10,
      targetWeight: e.target_weight as number || 0,
      restTime: e.rest_time as number || 90,
      sortOrder: e.sort_order as number || 0,
      notes: e.notes as string || '',
    };
  }

  function mapRecord(r: Record<string, unknown>) {
    return {
      id: r.id as number,
      userId: r.user_id as string,
      planId: r.plan_id as number | undefined,
      date: r.date as string || '',
      totalDuration: r.total_duration as number || 0,
      totalSets: r.total_sets as number || 0,
      totalReps: r.total_reps as number || 0,
      totalVolume: r.total_volume as number || 0,
      estimatedCalories: r.estimated_calories as number || 0,
      growthPoints: r.growth_points as number || 0,
      notes: r.notes as string || '',
      createdAt: r.created_at as string || '',
    };
  }

  function mapRecordExercise(e: Record<string, unknown>) {
    return {
      id: e.id as number,
      recordId: e.record_id as number,
      exerciseName: e.exercise_name as string || '',
      setNumber: e.set_number as number || 1,
      weight: e.weight as number || 0,
      reps: e.reps as number || 0,
      isPR: e.is_pr === 1 || e.is_pr === true,
    };
  }

  function mapWeightLog(w: Record<string, unknown>) {
    return {
      id: w.id as number,
      userId: w.user_id as string,
      date: w.date as string || '',
      weight: w.weight as number || 0,
      createdAt: w.created_at as string || '',
    };
  }

  function mapGrowthLog(g: Record<string, unknown>) {
    return {
      id: g.id as number,
      userId: g.user_id as string,
      date: g.date as string || '',
      points: g.points as number || 0,
      reason: g.reason as string || '',
      relatedRecordId: g.related_record_id as number | undefined,
      createdAt: g.created_at as string || '',
    };
  }

  // Replace local data with cloud data
  if (data.user) {
    const mappedUser = mapUser(data.user);
    const localAll = await db.users.toArray();
    const localKey = localAll[0]?.deepseekApiKey || '';
    const cloudKey = mappedUser.deepseekApiKey;
    mappedUser.deepseekApiKey = cloudKey || localKey || '';
    await db.users.clear();
    await db.users.add(mappedUser as never);
  }

  if (data.plans?.length) {
    const mapped = data.plans.map(mapPlan);
    await db.plans.clear();
    for (const item of mapped) await db.plans.put(item as never);
  }

  if (data.planExercises?.length) {
    const mapped = data.planExercises.map(mapPlanExercise);
    await db.planExercises.clear();
    for (const item of mapped) await db.planExercises.put(item as never);
  }

  if (data.records?.length) {
    const mapped = data.records.map(mapRecord);
    await db.records.clear();
    for (const item of mapped) await db.records.put(item as never);
  }

  if (data.recordExercises?.length) {
    const mapped = data.recordExercises.map(mapRecordExercise);
    await db.recordExercises.clear();
    for (const item of mapped) await db.recordExercises.put(item as never);
  }

  if (data.weightLogs?.length) {
    const mapped = data.weightLogs.map(mapWeightLog);
    await db.weightLogs.clear();
    for (const item of mapped) await db.weightLogs.put(item as never);
  }

  if (data.growthLogs?.length) {
    const mapped = data.growthLogs.map(mapGrowthLog);
    await db.growthLogs.clear();
    for (const item of mapped) await db.growthLogs.put(item as never);
  }
}

// Legacy alias
export const triggerSync = pushToCloud;

// Listen for online/offline events
export function initSyncListeners(): void {
  window.addEventListener('online', () => {
    useSyncStore.getState().setStatus('idle');
  });
  window.addEventListener('offline', () => {
    useSyncStore.getState().setStatus('offline');
  });
  if (!navigator.onLine) {
    useSyncStore.getState().setStatus('offline');
  }
}
