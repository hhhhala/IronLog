import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { db, getOrCreateUser } from '@/db/local-db';

interface UserState {
  user: UserProfile | null;
  loading: boolean;
  loadUser: () => Promise<void>;
  saveUser: (updates: Partial<UserProfile>) => Promise<void>;
  setUser: (user: UserProfile) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: true,

  loadUser: async () => {
    const user = await getOrCreateUser();
    set({ user, loading: false });
  },

  saveUser: async (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await db.users.put(updated);
    set({ user: updated });
  },

  setUser: (user) => set({ user }),
}));
