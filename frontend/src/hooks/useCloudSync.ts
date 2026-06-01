import { useCallback } from 'react';
import { useSyncStore } from '@/stores/sync-store';
import { triggerSync } from '@/services/sync';

export function useCloudSync() {
  const { status, lastSyncAt, error } = useSyncStore();

  const sync = useCallback(async () => {
    await triggerSync();
  }, []);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    status,
    lastSyncAt,
    error,
    isOnline,
    sync,
    isSyncing: status === 'syncing',
    isOffline: status === 'offline' || !isOnline,
  };
}
