"use client";

import { useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";

export type ViewKey =
  | "dashboard"
  | "santri"
  | "ustaz"
  | "kelas"
  | "kelompok"
  | "pembayaran"
  | "laporan"
  | "profil"
  | "users"
  | "database"
  | "whatsapp"
  | "supabase-setup";

export interface NavItem {
  key: ViewKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
}

const STORAGE_KEY = "an-nahl-nav-view";

function readInitialView(): ViewKey {
  if (typeof window === "undefined") return "dashboard";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ViewKey | null;
    return saved || "dashboard";
  } catch {
    return "dashboard";
  }
}

export function useAppNav() {
  const [view, setView] = useState<ViewKey>(readInitialView);

  const navigate = useCallback((v: ViewKey) => {
    setView(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
  }, []);

  return { view, navigate };
}
