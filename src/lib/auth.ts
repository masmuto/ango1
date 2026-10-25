export type UserRole = "admin" | "bendahara" | "pengelola";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  active?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  bendahara: "Bendahara",
  pengelola: "Pengelola",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Akses penuh ke seluruh sistem",
  bendahara: "Kelola pembayaran & laporan SPP",
  pengelola: "Kelola data santri, ustaz, dan kelas",
};

export function canManageUsers(role: UserRole | undefined | null): boolean {
  return role === "admin";
}

export function canManagePembayaran(role: UserRole | undefined | null): boolean {
  return role === "admin" || role === "bendahara";
}

export function canManageData(role: UserRole | undefined | null): boolean {
  return role === "admin" || role === "pengelola";
}

export function canViewReports(role: UserRole | undefined | null): boolean {
  return role === "admin" || role === "bendahara" || role === "pengelola";
}
