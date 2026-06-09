import Dexie, { Table } from 'dexie';
import type {
  UserProfile,
  TrainingPlan,
  PlanExercise,
  TrainingRecord,
  RecordExercise,
  WeightLog,
  GrowthLog,
  SyncQueueItem,
  ChatSession,
} from '@/types';

class IronLogDB extends Dexie {
  users!: Table<UserProfile, string>;
  plans!: Table<TrainingPlan, number>;
  planExercises!: Table<PlanExercise, number>;
  records!: Table<TrainingRecord, number>;
  recordExercises!: Table<RecordExercise, number>;
  weightLogs!: Table<WeightLog, number>;
  growthLogs!: Table<GrowthLog, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  chatSessions!: Table<ChatSession, number>;

  constructor() {
    super('IronLogDB');
    this.version(1).stores({
      users: 'id, updatedAt',
      plans: '++id, userId, isActive, createdAt',
      planExercises: '++id, planId, dayNumber, sortOrder',
      records: '++id, userId, planId, date, createdAt',
      recordExercises: '++id, recordId',
      weightLogs: '++id, userId, date',
      growthLogs: '++id, userId, date',
      syncQueue: '++id, tableName, timestamp',
      chatSessions: '++id, updatedAt',
    });

    // Hooks for auto-generated UUID on user creation
    this.users.hook('creating', (_, obj) => {
      if (!obj.id) {
        obj.id = crypto.randomUUID();
      }
    });
  }
}

export const db = new IronLogDB();

// Helper: get or create user
export async function getOrCreateUser(): Promise<UserProfile> {
  const all = await db.users.toArray();
  if (all.length > 0) return all[0];

  const user: UserProfile = {
    id: crypto.randomUUID(),
    nickname: '',
    height: 170,
    weight: 70,
    goal: '增肌',
    trainingExperience: '新手',
    weeklyFrequency: 3,
    deepseekApiKey: '',
    timerMode: 'countup',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.users.put(user);
  return user;
}

// Helper: get active plan
export async function getActivePlan(): Promise<TrainingPlan | undefined> {
  const plan = await db.plans.where({ isActive: 1 }).first();
  if (!plan) return undefined;
  const exercises = await db.planExercises.where({ planId: plan.id }).sortBy('sortOrder');
  return { ...plan, exercises };
}

// Helper: get all plans with exercises
export async function getAllPlans(): Promise<TrainingPlan[]> {
  const plans = await db.plans.orderBy('createdAt').reverse().toArray();
  return Promise.all(
    plans.map(async (plan) => {
      const exercises = await db.planExercises.where({ planId: plan.id }).sortBy('sortOrder');
      return { ...plan, exercises };
    })
  );
}

// Helper: save plan with exercises
export async function savePlan(plan: TrainingPlan): Promise<number> {
  const { exercises, ...planData } = plan;
  let planId = planData.id;
  if (planId) {
    await db.plans.update(planId, { ...planData, updatedAt: new Date().toISOString() });
    await db.planExercises.where({ planId }).delete();
  } else {
    planData.createdAt = new Date().toISOString();
    planData.updatedAt = new Date().toISOString();
    planId = await db.plans.add(planData);
  }
  const exs = exercises || [];
  for (let i = 0; i < exs.length; i++) {
    const ex = { ...exs[i], planId, sortOrder: i };
    delete ex.id;
    await db.planExercises.add(ex);
  }
  return planId!;
}

// Helper: delete plan
export async function deletePlan(planId: number): Promise<void> {
  await db.planExercises.where({ planId }).delete();
  await db.plans.delete(planId);
}

// Helper: get records with exercises
export async function getAllRecords(): Promise<TrainingRecord[]> {
  const records = await db.records.orderBy('date').reverse().toArray();
  return Promise.all(
    records.map(async (r) => {
      const exercises = await db.recordExercises.where({ recordId: r.id }).toArray();
      return { ...r, exercises };
    })
  );
}

// Helper: save record with exercises
export async function saveRecord(record: TrainingRecord): Promise<number> {
  const { exercises, ...recordData } = record;
  let recordId = recordData.id;
  if (recordId) {
    await db.records.update(recordId, recordData);
    await db.recordExercises.where({ recordId }).delete();
  } else {
    recordId = await db.records.add(recordData);
  }
  for (const ex of (exercises || [])) {
    await db.recordExercises.add({ ...ex, recordId });
  }
  return recordId!;
}

// Helper: delete record
export async function deleteRecord(recordId: number): Promise<void> {
  await db.recordExercises.where({ recordId }).delete();
  await db.growthLogs.filter(g => g.relatedRecordId === recordId).delete();
  await db.records.delete(recordId);
}

// Helper: get records by date range
export async function getRecordsByDateRange(startDate: string, endDate: string): Promise<TrainingRecord[]> {
  return db.records
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

// Enqueue a sync item
export async function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
  await db.syncQueue.add({ ...item, timestamp: Date.now() });
}
