"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SessionUser } from "@/lib/auth";

interface SessionState {
  user: SessionUser | null;
  isAuthed: boolean;
  hydrated: boolean;
  login: (user: SessionUser) => void;
  logout: () => void;
  setUser: (user: SessionUser) => void;
  setHydrated: (v: boolean) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      isAuthed: false,
      hydrated: false,
      login: (user) => set({ user, isAuthed: true }),
      logout: () => set({ user: null, isAuthed: false }),
      setUser: (user) => set({ user }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "an-nahl-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthed: state.isAuthed }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
