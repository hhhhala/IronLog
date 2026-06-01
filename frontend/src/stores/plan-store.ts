import { create } from 'zustand';
import type { TrainingPlan } from '@/types';
import { getAllPlans, savePlan, deletePlan, getActivePlan } from '@/db/local-db';

interface PlanState {
  plans: TrainingPlan[];
  activePlan: TrainingPlan | null;
  loading: boolean;
  loadPlans: () => Promise<void>;
  loadActivePlan: () => Promise<void>;
  savePlan: (plan: TrainingPlan) => Promise<number>;
  deletePlan: (id: number) => Promise<void>;
  setActive: (planId: number) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  activePlan: null,
  loading: true,

  loadPlans: async () => {
    const plans = await getAllPlans();
    const active = await getActivePlan();
    set({ plans, activePlan: active || null, loading: false });
  },

  loadActivePlan: async () => {
    const active = await getActivePlan();
    set({ activePlan: active || null });
  },

  savePlan: async (plan) => {
    // If setting as active, deactivate others
    if (plan.isActive) {
      const current = get().plans;
      for (const p of current) {
        if (p.id && p.id !== plan.id && p.isActive) {
          await savePlan({ ...p, exercises: p.exercises, isActive: false });
        }
      }
    }
    const id = await savePlan(plan);
    const updatedPlan = { ...plan, id };
    set((s) => ({
      plans: s.plans.some((p) => p.id === id)
        ? s.plans.map((p) => (p.id === id ? updatedPlan : p))
        : [...s.plans, updatedPlan],
      activePlan: updatedPlan.isActive ? updatedPlan : s.activePlan,
    }));
    return id;
  },

  deletePlan: async (id) => {
    await deletePlan(id);
    set((s) => ({
      plans: s.plans.filter((p) => p.id !== id),
      activePlan: s.activePlan?.id === id ? null : s.activePlan,
    }));
  },

  setActive: async (planId) => {
    const plans = get().plans;
    for (const p of plans) {
      const updated = { ...p, exercises: p.exercises, isActive: p.id === planId };
      await savePlan(updated);
    }
    const active = plans.find((p) => p.id === planId) || null;
    set({
      plans: plans.map((p) => ({ ...p, exercises: p.exercises, isActive: p.id === planId })),
      activePlan: active,
    });
  },
}));
