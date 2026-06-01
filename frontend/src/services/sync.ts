// Sync Engine - manages local ↔ cloud synchronization
import { useSyncStore } from '@/stores/sync-store';
import { db } from '@/db/local-db';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function triggerSync(): Promise<void> {
  const { syncNow } = useSyncStore.getState();
  const store = useSyncStore.getState();

  // Check online status
  if (!navigator.onLine) {
    store.setStatus('offline');
    return;
  }

  await syncNow(API_BASE);
}

export async function markForSync(
  tableName: string,
  recordId: string | number,
  action: 'create' | 'update' | 'delete',
  payload: unknown
): Promise<void> {
  const { queueSync } = useSyncStore.getState();
  await queueSync({ tableName, recordId, action, payload });

  // Try to sync immediately if online
  if (navigator.onLine) {
    triggerSync().catch(() => {});
  }
}

// Listen for online/offline events
export function initSyncListeners(): void {
  const store = useSyncStore.getState;

  window.addEventListener('online', () => {
    store().setStatus('idle');
    triggerSync().catch(() => {});
  });

  window.addEventListener('offline', () => {
    store().setStatus('offline');
  });

  // Initial status
  if (!navigator.onLine) {
    store().setStatus('offline');
  }
}
