import { useSyncStore } from '@/stores/sync-store';
import { db } from '@/db/local-db';

const API_BASE = import.meta.env.VITE_API_URL || '';

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

  // Replace local user with cloud user (ensures same ID across devices)
  if (data.user) {
    const cloudUser = data.user as Record<string, unknown>;
    // Preserve local API key if cloud doesn't have one (e.g. before migration)
    const localUser = await db.users.toArray().then(a => a[0]);
    const localApiKey = localUser?.deepseekApiKey || '';

    // Map snake_case DB fields to camelCase TS types
    const mappedUser = {
      id: cloudUser.id as string,
      nickname: cloudUser.nickname as string || '',
      height: cloudUser.height as number || 170,
      weight: cloudUser.weight as number || 70,
      goal: cloudUser.goal as string || '增肌',
      trainingExperience: cloudUser.training_experience as string || '新手',
      weeklyFrequency: cloudUser.weekly_frequency as number || 3,
      deepseekApiKey: (cloudUser.deepseek_api_key as string) || localApiKey || '',
      updatedAt: cloudUser.updated_at as string || new Date().toISOString(),
    } as never;
    await db.users.clear();
    await db.users.add(mappedUser);
  }

  // Replace all plans (clear local, import cloud)
  if (data.plans) {
    await db.plans.clear();
    for (const plan of data.plans) await db.plans.put(plan as never);
  }

  if (data.planExercises) {
    await db.planExercises.clear();
    for (const ex of data.planExercises) await db.planExercises.put(ex as never);
  }

  if (data.records) {
    await db.records.clear();
    for (const r of data.records) await db.records.put(r as never);
  }

  if (data.recordExercises) {
    await db.recordExercises.clear();
    for (const ex of data.recordExercises) await db.recordExercises.put(ex as never);
  }

  if (data.weightLogs) {
    await db.weightLogs.clear();
    for (const log of data.weightLogs) await db.weightLogs.put(log as never);
  }

  if (data.growthLogs) {
    await db.growthLogs.clear();
    for (const log of data.growthLogs) await db.growthLogs.put(log as never);
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
