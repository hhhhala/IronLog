import { create } from 'zustand';
import type { SyncStatus, SyncQueueItem } from '@/types';
import { db, enqueueSync } from '@/db/local-db';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  error: string | null;

  setStatus: (status: SyncStatus) => void;
  syncNow: (apiBase: string) => Promise<void>;
  queueSync: (item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => Promise<void>;
  processQueue: (apiBase: string) => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  error: null,

  setStatus: (status) => set({ status }),

  queueSync: async (item) => {
    await enqueueSync(item);
    set({ status: 'idle' });
  },

  syncNow: async (apiBase: string) => {
    set({ status: 'syncing', error: null });
    try {
      // Upload all local data to cloud
      const user = await db.users.toArray();
      const plans = await db.plans.toArray();
      const planExercises = await db.planExercises.toArray();
      const records = await db.records.toArray();
      const recordExercises = await db.recordExercises.toArray();
      const weightLogs = await db.weightLogs.toArray();
      const growthLogs = await db.growthLogs.toArray();

      const res = await fetch(`${apiBase}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user[0] || null,
          plans,
          planExercises,
          records,
          recordExercises,
          weightLogs,
          growthLogs,
        }),
      });

      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

      const data = await res.json();
      set({ status: 'idle', lastSyncAt: new Date().toISOString(), error: null });
    } catch (err: any) {
      set({ status: 'error', error: err.message || 'Sync failed' });
    }
  },

  processQueue: async (apiBase: string) => {
    const queue = await db.syncQueue.orderBy('timestamp').toArray();
    for (const item of queue) {
      try {
        // Individual sync handling would go here
        await db.syncQueue.delete(item.id!);
      } catch {
        // Keep in queue for retry
      }
    }
  },
}));
