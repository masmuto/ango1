import type { Prisma } from "@prisma/client";

/**
 * Convert Prisma DateTime fields to ISO strings for JSON serialization.
 * For Firestore data (already returned as plain objects with ISO strings),
 * this is effectively an identity function.
 */
export function serialize<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => {
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "bigint") return v.toString();
      return v;
    }),
  ) as T;
}

export function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Re-export Prisma namespace for convenience
export type { Prisma };
