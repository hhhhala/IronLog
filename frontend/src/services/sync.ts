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

  const user = await db.users.toArray().then(a => a[0]);
  if (!user) throw new Error('本地无用户，请先在个人中心创建');

  const res = await fetch(`${API_BASE}/api/sync/pull?userId=${encodeURIComponent(user.id)}`);
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

  // Merge user (cloud version wins for most fields, but keep local API key)
  if (data.user) {
    const cloudUser = data.user as Record<string, unknown>;
    const merged = {
      ...user,
      ...cloudUser,
      // Keep local API key if not empty, otherwise use cloud
      deepseekApiKey: (user as unknown as Record<string, unknown>).deepseekApiKey || cloudUser.deepseekApiKey || '',
      updatedAt: new Date().toISOString(),
    };
    await db.users.put(merged as never);
  }

  // Merge plans
  if (data.plans) {
    for (const plan of data.plans) {
      const existing = await db.plans.get(plan.id as number);
      if (!existing) await db.plans.put(plan as never);
    }
  }

  // Merge plan exercises
  if (data.planExercises) {
    for (const ex of data.planExercises) {
      const existing = await db.planExercises.get(ex.id as number);
      if (!existing) await db.planExercises.put(ex as never);
    }
  }

  // Merge records
  if (data.records) {
    for (const r of data.records) {
      const existing = await db.records.get(r.id as number);
      if (!existing) await db.records.put(r as never);
    }
  }

  // Merge record exercises
  if (data.recordExercises) {
    for (const ex of data.recordExercises) {
      const existing = await db.recordExercises.get(ex.id as number);
      if (!existing) await db.recordExercises.put(ex as never);
    }
  }

  // Merge weight logs
  if (data.weightLogs) {
    for (const log of data.weightLogs) {
      const existing = await db.weightLogs.get(log.id as number);
      if (!existing) await db.weightLogs.put(log as never);
    }
  }

  // Merge growth logs
  if (data.growthLogs) {
    for (const log of data.growthLogs) {
      const existing = await db.growthLogs.get(log.id as number);
      if (!existing) await db.growthLogs.put(log as never);
    }
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
