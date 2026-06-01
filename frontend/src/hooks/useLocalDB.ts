import { useCallback } from 'react';
import { db, getAllPlans, getAllRecords, getActivePlan } from '@/db/local-db';

export function useLocalDB() {
  const refreshPlans = useCallback(async () => {
    return getAllPlans();
  }, []);

  const refreshRecords = useCallback(async () => {
    return getAllRecords();
  }, []);

  const getActive = useCallback(async () => {
    return getActivePlan();
  }, []);

  const exportData = useCallback(async () => {
    const data = {
      users: await db.users.toArray(),
      plans: await db.plans.toArray(),
      planExercises: await db.planExercises.toArray(),
      records: await db.records.toArray(),
      recordExercises: await db.recordExercises.toArray(),
      weightLogs: await db.weightLogs.toArray(),
      growthLogs: await db.growthLogs.toArray(),
      exportedAt: new Date().toISOString(),
    };
    return data;
  }, []);

  const importData = useCallback(async (data: Record<string, unknown[]>) => {
    if (data.users) await db.users.bulkPut(data.users as never[]);
    if (data.plans) await db.plans.bulkPut(data.plans as never[]);
    if (data.planExercises) await db.planExercises.bulkPut(data.planExercises as never[]);
    if (data.records) await db.records.bulkPut(data.records as never[]);
    if (data.recordExercises) await db.recordExercises.bulkPut(data.recordExercises as never[]);
    if (data.weightLogs) await db.weightLogs.bulkPut(data.weightLogs as never[]);
    if (data.growthLogs) await db.growthLogs.bulkPut(data.growthLogs as never[]);
  }, []);

  return { refreshPlans, refreshRecords, getActive, exportData, importData };
}
