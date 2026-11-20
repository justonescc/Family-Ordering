import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Family, FamilyMember, User } from '../types';

interface AuthStore {
  token: string | null;
  user: User | null;
  family: Family | null;
  member: FamilyMember | null;
  families: Family[];
  lastFamilyId: string | null;

  setSession: (payload: {
    token: string;
    user: User;
    family: Family | null;
    member: FamilyMember | null;
    families: Family[];
    lastFamilyId?: string | null;
  }) => void;
  setCurrentFamily: (family: Family, member: FamilyMember, token: string) => void;
  setFamilies: (families: Family[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      family: null,
      member: null,
      families: [],
      lastFamilyId: null,

      setSession: (payload) =>
        set({
          token: payload.token,
          user: payload.user,
          family: payload.family,
          member: payload.member,
          families: payload.families,
          lastFamilyId: payload.lastFamilyId ?? null,
        }),

      setCurrentFamily: (family, member, token) => set({ family, member, token }),

      setFamilies: (families) => set({ families }),

      logout: () =>
        set({
          token: null,
          user: null,
          family: null,
          member: null,
          families: [],
          lastFamilyId: null,
        }),
    }),
    { name: 'family-auth' },
  ),
);
