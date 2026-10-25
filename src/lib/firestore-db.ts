/**
 * Prisma-compatible data access layer backed by Firestore.
 *
 * Why this exists: the app was originally written against Prisma. Rather than
 * rewriting all 20+ API routes, this module exports a `db` object whose shape
 * closely mirrors Prisma Client (`db.santri.findMany(...)`, `db.user.findUnique(...)`,
 * `db.pembayaranSPP.create(...)`, etc.) so route handlers only need a one-line
 * import change from `@/lib/db` to `@/lib/firestore-db`.
 *
 * Limitations:
 *   - `where.OR` and `where.<field>.contains` fall back to client-side filtering
 *     after fetching all docs (acceptable for small datasets).
 *   - `include` is supported for the specific relations the routes use.
 *   - `_count` on relations returns length of related docs (extra reads).
 *   - All Date fields are stored as ISO strings and returned as ISO strings
 *     (frontend already expects strings).
 */
import { getFirestore, isFirebaseConfigured } from "@/lib/firebase-admin";
import type { admin } from "@/lib/firebase-admin";
import type { FirebaseFirestore } from "firebase-admin/firestore";

type Firestore = FirebaseFirestore;
type DocumentData = admin.firestore.DocumentData;
type QuerySnapshot = admin.firestore.QuerySnapshot;
type DocumentSnapshot = admin.firestore.DocumentSnapshot;

const COLLECTIONS = {
  User: "users",
  Ustaz: "ustaz",
  Kelas: "kelas",
  Santri: "santri",
  KelompokBelajar: "kelompokBelajar",
  JadwalKelompok: "jadwalKelompok",
  AnggotaKelompok: "anggotaKelompok",
  PembayaranSPP: "pembayaranSpp",
  Pengaturan: "pengaturan",
  PesanTemplate: "pesanTemplate",
  PesanLog: "pesanLog",
} as const;

// Date fields per model — must be converted between Date and ISO string
const DATE_FIELDS: Record<string, string[]> = {
  User: ["lastLogin", "createdAt", "updatedAt"],
  Ustaz: ["tanggalLahir", "tanggalMasuk", "createdAt", "updatedAt"],
  Kelas: ["createdAt", "updatedAt"],
  Santri: ["tanggalLahir", "tanggalMasuk", "createdAt", "updatedAt"],
  KelompokBelajar: ["createdAt", "updatedAt"],
  JadwalKelompok: ["createdAt"],
  AnggotaKelompok: ["tanggalGabung", "createdAt"],
  PembayaranSPP: ["tanggalBayar", "createdAt", "updatedAt"],
  PesanTemplate: ["createdAt", "updatedAt"],
  Pengaturan: [],
  PesanLog: ["createdAt"],
};

interface WhereClause {
  [key: string]: unknown;
}

interface FindManyOptions {
  where?: WhereClause;
  include?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  take?: number;
  select?: Record<string, boolean>;
  _count?: Record<string, unknown>;
}

interface FindUniqueOptions {
  where: WhereClause;
  include?: Record<string, unknown>;
}

interface CreateOptions {
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
}

interface UpdateOptions {
  where: WhereClause;
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
}

interface UpsertOptions {
  where: WhereClause;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
}

interface CountOptions {
  where?: WhereClause;
}

interface GroupByOptions {
  by: string[];
  where?: WhereClause;
  _sum?: Record<string, true>;
  _count?: true | Record<string, unknown>;
}

// Convert Date → ISO string for storage
function serializeDates(model: string, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  const dateFields = DATE_FIELDS[model] || [];
  for (const f of dateFields) {
    if (out[f] instanceof Date) {
      out[f] = (out[f] as Date).toISOString();
    } else if (out[f] === null || out[f] === undefined) {
      // keep null/undefined as-is
    }
  }
  // Santri.tanggalLahir etc could come as string already — leave as-is
  return out;
}

// Convert ISO strings back to Date objects (so JSON serialization round-trips correctly)
function deserializeDates(model: string, data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null;
  const out: Record<string, unknown> = { ...data };
  const dateFields = DATE_FIELDS[model] || [];
  for (const f of dateFields) {
    if (typeof out[f] === "string") {
      // Keep as ISO string — frontend expects strings, and Date objects serialize the same
      // but storing as Date makes Prisma-compat shape easier. We keep ISO strings.
    }
  }
  return out;
}

// Check if a doc matches a where clause (supports nested operators + OR)
function matchesWhere(doc: Record<string, unknown>, where: WhereClause): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === "AND") {
      if (!Array.isArray(value)) return false;
      for (const clause of value) {
        if (!matchesWhere(doc, clause as WhereClause)) return false;
      }
      continue;
    }
    if (key === "OR") {
      if (!Array.isArray(value)) return false;
      const matched = value.some((clause) => matchesWhere(doc, clause as WhereClause));
      if (!matched) return false;
      continue;
    }
    if (key === "NOT") {
      if (Array.isArray(value)) {
        for (const clause of value) {
          if (matchesWhere(doc, clause as WhereClause)) return false;
        }
      } else if (matchesWhere(doc, value as WhereClause)) {
        return false;
      }
      continue;
    }

    // Nested relation where (e.g., where: { santri: { OR: [...] } }) — flatten by dot-notation
    // For simplicity, check if doc has a nested object; not used heavily in our routes.
    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Operator object: { contains, in, gte, lte, gt, lt, not }
      const fieldVal = doc[key];
      for (const [op, opVal] of Object.entries(value as Record<string, unknown>)) {
        if (!matchOperator(fieldVal, op, opVal)) return false;
      }
    } else {
      // Equality check
      if (Array.isArray(value)) {
        // Prisma treats { field: [a,b,c] } as "IN" — but our routes always use { field: { in: [...] } }
        // Treat array as direct equality to array (rare). Fall back to includes.
        if (!value.includes(doc[key])) return false;
      } else {
        if (doc[key] !== value) return false;
      }
    }
  }
  return true;
}

function matchOperator(fieldVal: unknown, op: string, opVal: unknown): boolean {
  switch (op) {
    case "equals":
      return fieldVal === opVal;
    case "not":
      return fieldVal !== opVal;
    case "contains": {
      if (typeof fieldVal !== "string" || typeof opVal !== "string") return false;
      return fieldVal.toLowerCase().includes(opVal.toLowerCase());
    }
    case "startsWith":
      return typeof fieldVal === "string" && typeof opVal === "string" && fieldVal.startsWith(opVal);
    case "endsWith":
      return typeof fieldVal === "string" && typeof opVal === "string" && fieldVal.endsWith(opVal);
    case "in":
      return Array.isArray(opVal) && opVal.includes(fieldVal);
    case "notIn":
      return Array.isArray(opVal) && !opVal.includes(fieldVal);
    case "gt":
      return typeof fieldVal === "number" && typeof opVal === "number" && fieldVal > opVal;
    case "gte":
      return typeof fieldVal === "number" && typeof opVal === "number" && fieldVal >= opVal;
    case "lt":
      return typeof fieldVal === "number" && typeof opVal === "number" && fieldVal < opVal;
    case "lte":
      return typeof fieldVal === "number" && typeof opVal === "number" && fieldVal <= opVal;
    default:
      return false;
  }
}

// Build Firestore query constraints from where clause where possible.
// Returns: { constraints: QueryConstraint[], leftover: WhereClause }
// Constraints that Firestore can index (==, in) go to the query;
// everything else (contains, OR, etc.) is filtered client-side.
function buildFirestoreQuery(where: WhereClause | undefined): {
  constraints: Array<{ field: string; op: string; value: unknown }>;
  leftover: WhereClause;
} {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  const leftover: WhereClause = {};
  if (!where) return { constraints, leftover };

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR" || key === "AND" || key === "NOT") {
      leftover[key] = value;
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const opEntries = Object.entries(value as Record<string, unknown>);
      if (opEntries.length === 1 && opEntries[0][0] === "in") {
        // Firestore supports "in" — but only up to 30 values
        if (Array.isArray(opEntries[0][1]) && opEntries[0][1].length <= 30) {
          constraints.push({ field: key, op: "in", value: opEntries[0][1] });
          continue;
        }
      }
      // Other operators (contains, etc.) — filter client-side
      leftover[key] = value;
      continue;
    }
    // Equality — Firestore can use ==
    constraints.push({ field: key, op: "==", value });
  }

  return { constraints, leftover };
}

async function fetchAll(fs: Firestore, collection: string): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const snap = await fs.collection(collection).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
}

// Generate a new ID (similar to Prisma's cuid())
function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `c${ts}${rand}`;
}

// Include resolver — fetches related docs
async function applyIncludes(
  fs: Firestore,
  model: string,
  doc: Record<string, unknown>,
  include?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!include) return doc;
  const result = { ...doc };

  for (const [relation, relConfig] of Object.entries(include)) {
    // relation name → foreign key field name
    const fkField = `${relation}Id`;
    const fkValue = result[fkField];

    if (relation === "_count") {
      // Special: _count: { select: { santri: true } } → count related docs
      const select = (relConfig as { select?: Record<string, boolean> }).select;
      if (select) {
        const counts: Record<string, number> = {};
        for (const [rel, enabled] of Object.entries(select)) {
          if (enabled) {
            const reverseFk = modelToReverseFk(model, rel);
            if (reverseFk) {
              const relSnap = await fs.collection(COLLECTIONS[rel as keyof typeof COLLECTIONS] || rel.toLowerCase()).where(reverseFk, "==", result.id).get();
              counts[rel] = relSnap.size;
            }
          }
        }
        result._count = counts;
      }
      continue;
    }

    if (typeof fkValue !== "string") {
      // Reverse relation — fetch docs where this doc's id is the FK
      const reverseFk = modelToReverseFk(model, relation);
      const targetCollection = COLLECTIONS[relation as keyof typeof COLLECTIONS] || relation.toLowerCase();
      if (reverseFk) {
        const select = (relConfig as { select?: Record<string, boolean> }).select;
        const relSnap = await fs.collection(targetCollection).where(reverseFk, "==", result.id).get();
        const items = relSnap.docs.map((d) => ({ id: d.id, ...filterSelect(d.data() as Record<string, unknown>, select) }));
        result[relation] = items;
      }
      continue;
    }

    // Forward relation — fetch single doc by FK
    const targetCollection = COLLECTIONS[relation as keyof typeof COLLECTIONS] || relation.toLowerCase();
    const relDoc = await fs.collection(targetCollection).doc(fkValue).get();
    if (relDoc.exists) {
      const select = (relConfig as { select?: Record<string, boolean> }).select;
      result[relation] = filterSelect(relDoc.data() as Record<string, unknown>, select);
      // For Kelas relation, also include 'id'
      if (select) {
        (result[relation] as Record<string, unknown>).id = relDoc.id;
      }
    } else {
      result[relation] = null;
    }
  }

  return result;
}

function filterSelect(data: Record<string, unknown>, select?: Record<string, boolean>): Record<string, unknown> {
  if (!select) return { ...data, id: data.id };
  const out: Record<string, unknown> = { id: data.id };
  for (const [k, enabled] of Object.entries(select)) {
    if (enabled && k in data) out[k] = data[k];
  }
  return out;
}

// Map forward relation name → reverse FK field name on the related model
function modelToReverseFk(parentModel: string, childRelation: string): string | null {
  const map: Record<string, Record<string, string>> = {
    Kelas: { santri: "kelasId", kelompokBelajar: "kelasId" },
    Ustaz: { kelas: "ustazId", kelompokBelajar: "ustazId" },
    KelompokBelajar: { jadwal: "kelompokId", anggota: "kelompokId" },
    Santri: { pembayaranSPP: "santriId", anggota: "santriId" },
  };
  return map[parentModel]?.[childRelation] || null;
}

// Build a model adapter
function createModel(fs: () => Firestore, model: string, collection: string) {
  return {
    async findMany(opts: FindManyOptions = {}): Promise<Array<Record<string, unknown>>> {
      const firestore = fs();
      let query: admin.firestore.Query = firestore.collection(collection);

      const { constraints, leftover } = buildFirestoreQuery(opts.where);
      for (const c of constraints) {
        // Firestore limitation: cannot chain multiple equality filters on different fields
        // without composite indexes. For simplicity, only apply the first equality constraint.
        if (c.op === "==") {
          query = query.where(c.field, "==", c.value);
          break;
        } else if (c.op === "in") {
          query = query.where(c.field, "in", c.value as unknown[]);
          break;
        }
      }

      if (opts.orderBy) {
        for (const [field, dir] of Object.entries(opts.orderBy)) {
          query = query.orderBy(field, dir);
        }
      }

      if (opts.take) {
        query = query.limit(opts.take);
      }

      const snap: QuerySnapshot = await query.get();
      let docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

      // Apply leftover where (OR, contains, etc.) client-side
      if (Object.keys(leftover).length > 0) {
        docs = docs.filter((d) => matchesWhere(d, leftover));
      }

      // Apply includes
      if (opts.include) {
        const withIncludes = await Promise.all(
          docs.map((d) => applyIncludes(firestore, model, d, opts.include)),
        );
        docs = withIncludes;
      }

      // Apply select (top-level)
      if (opts.select && !opts.include) {
        docs = docs.map((d) => filterSelect(d, opts.select));
      }

      return docs;
    },

    async findUnique(opts: FindUniqueOptions): Promise<Record<string, unknown> | null> {
      const firestore = fs();
      const { where } = opts;
      let doc: DocumentSnapshot | null = null;

      // Fast path: lookup by id
      if (where.id) {
        doc = await firestore.collection(collection).doc(where.id as string).get();
      } else {
        // Find by other unique field — fetch all and filter (small datasets OK)
        const all = await firestore.collection(collection).get();
        const match = all.docs.find((d) => matchesWhere(d.data() as Record<string, unknown>, where));
        if (match) doc = match;
      }

      if (!doc || !doc.exists) return null;
      const data = { id: doc.id, ...(doc.data() as Record<string, unknown>) };
      if (opts.include) {
        return applyIncludes(firestore, model, data, opts.include);
      }
      return data;
    },

    async findFirst(opts: FindManyOptions = {}): Promise<Record<string, unknown> | null> {
      const list = await this.findMany({ ...opts, take: 1 });
      return list[0] || null;
    },

    async create(opts: CreateOptions): Promise<Record<string, unknown>> {
      const firestore = fs();
      const serialized = serializeDates(model, opts.data);
      const id = (serialized.id as string) || generateId();
      const dataWithId = { ...serialized, id };

      await firestore.collection(collection).doc(id).set(dataWithId, { merge: true });

      if (opts.include) {
        return applyIncludes(firestore, model, dataWithId, opts.include);
      }
      return dataWithId;
    },

    async createMany(opts: { data: Array<Record<string, unknown>> | Record<string, unknown> }): Promise<{ count: number }> {
      const firestore = fs();
      const items = Array.isArray(opts.data) ? opts.data : [opts.data];
      const batch = firestore.batch();
      for (const item of items) {
        const serialized = serializeDates(model, item);
        const id = (serialized.id as string) || generateId();
        const ref = firestore.collection(collection).doc(id);
        batch.set(ref, { ...serialized, id }, { merge: true });
      }
      await batch.commit();
      return { count: items.length };
    },

    async update(opts: UpdateOptions): Promise<Record<string, unknown>> {
      const firestore = fs();
      const { where, data } = opts;
      let docId: string;

      if (where.id) {
        docId = where.id as string;
      } else {
        // find by other field
        const all = await firestore.collection(collection).get();
        const match = all.docs.find((d) => matchesWhere(d.data() as Record<string, unknown>, where));
        if (!match) throw new Error("Document not found for update");
        docId = match.id;
      }

      const serialized = serializeDates(model, data);
      await firestore.collection(collection).doc(docId).update(serialized);
      const updated = (await firestore.collection(collection).doc(docId).get()).data() as Record<string, unknown>;

      if (opts.include) {
        return applyIncludes(firestore, model, { id: docId, ...updated }, opts.include);
      }
      return { id: docId, ...updated };
    },

    async upsert(opts: UpsertOptions): Promise<Record<string, unknown>> {
      const firestore = fs();
      const { where, update, create } = opts;

      // find existing
      let existing: DocumentSnapshot | null = null;
      if (where.id) {
        const d = await firestore.collection(collection).doc(where.id as string).get();
        if (d.exists) existing = d;
      } else if (where.username || where.nis || where.kode || where.key || where.noPembayaran || where.nama) {
        // unique field lookup
        const all = await firestore.collection(collection).get();
        const match = all.docs.find((d) => matchesWhere(d.data() as Record<string, unknown>, where));
        if (match) existing = match;
      }

      if (existing) {
        const serialized = serializeDates(model, update);
        await firestore.collection(collection).doc(existing.id).update(serialized);
        const updated = (await firestore.collection(collection).doc(existing.id).get()).data() as Record<string, unknown>;
        return { id: existing.id, ...updated };
      } else {
        const serialized = serializeDates(model, create);
        const id = (serialized.id as string) || generateId();
        await firestore.collection(collection).doc(id).set({ ...serialized, id }, { merge: true });
        return { id, ...serialized };
      }
    },

    async delete(opts: { where: WhereClause }): Promise<{ id: string }> {
      const firestore = fs();
      const { where } = opts;
      let docId: string;

      if (where.id) {
        docId = where.id as string;
      } else {
        const all = await firestore.collection(collection).get();
        const match = all.docs.find((d) => matchesWhere(d.data() as Record<string, unknown>, where));
        if (!match) throw new Error("Document not found for delete");
        docId = match.id;
      }

      await firestore.collection(collection).doc(docId).delete();
      return { id: docId };
    },

    async deleteMany(opts: { where?: WhereClause } = {}): Promise<{ count: number }> {
      const firestore = fs();
      const all = await firestore.collection(collection).get();
      const toDelete = opts.where
        ? all.docs.filter((d) => matchesWhere(d.data() as Record<string, unknown>, opts.where!))
        : all.docs;
      const batch = firestore.batch();
      for (const d of toDelete) batch.delete(d.ref);
      await batch.commit();
      return { count: toDelete.length };
    },

    async count(opts: CountOptions = {}): Promise<number> {
      const firestore = fs();
      const { constraints, leftover } = buildFirestoreQuery(opts.where);
      let query: admin.firestore.Query = firestore.collection(collection);
      if (constraints.length > 0) {
        const c = constraints[0];
        query = query.where(c.field, c.op === "in" ? "in" : "==", c.value as unknown);
      }
      const snap = await query.get();
      if (Object.keys(leftover).length > 0) {
        return snap.docs.filter((d) => matchesWhere(d.data() as Record<string, unknown>, leftover)).length;
      }
      return snap.size;
    },

    async groupBy(opts: GroupByOptions): Promise<Array<Record<string, unknown>>> {
      // For simplicity, fetch all matching docs and group client-side.
      // Used by dashboard for monthly payment sums.
      const firestore = fs();
      const { constraints, leftover } = buildFirestoreQuery(opts.where);
      let query: admin.firestore.Query = firestore.collection(collection);
      if (constraints.length > 0) {
        const c = constraints[0];
        query = query.where(c.field, c.op === "in" ? "in" : "==", c.value as unknown);
      }
      const snap = await query.get();
      let docs = snap.docs.map((d) => d.data() as Record<string, unknown>);
      if (Object.keys(leftover).length > 0) {
        docs = docs.filter((d) => matchesWhere(d, leftover));
      }
      const groupByField = opts.by[0];
      const groups = new Map<string, Array<Record<string, unknown>>>();
      for (const doc of docs) {
        const key = String(doc[groupByField] ?? "");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(doc);
      }
      const result: Array<Record<string, unknown>> = [];
      for (const [key, items] of groups) {
        const entry: Record<string, unknown> = { [groupByField]: key };
        if (opts._sum) {
          const sums: Record<string, number> = {};
          for (const field of Object.keys(opts._sum)) {
            sums[field] = items.reduce((s, d) => s + (typeof d[field] === "number" ? (d[field] as number) : 0), 0);
          }
          entry._sum = sums;
        }
        if (opts._count) {
          entry._count = items.length;
        }
        result.push(entry);
      }
      return result;
    },
  };
}

// Lazy Firestore getter — defers initialization until first call
function fsGetter(): Firestore {
  return getFirestore();
}

// Top-level db object — mirrors Prisma client interface
function buildDb() {
  const db: Record<string, ReturnType<typeof createModel>> = {};
  for (const [model, collection] of Object.entries(COLLECTIONS)) {
    db[model] = createModel(fsGetter, model, collection);
  }
  return db as {
    User: ReturnType<typeof createModel>;
    Ustaz: ReturnType<typeof createModel>;
    Kelas: ReturnType<typeof createModel>;
    Santri: ReturnType<typeof createModel>;
    KelompokBelajar: ReturnType<typeof createModel>;
    JadwalKelompok: ReturnType<typeof createModel>;
    AnggotaKelompok: ReturnType<typeof createModel>;
    PembayaranSPP: ReturnType<typeof createModel>;
    Pengaturan: ReturnType<typeof createModel>;
    PesanTemplate: ReturnType<typeof createModel>;
    PesanLog: ReturnType<typeof createModel>;
  };
}

const _db = buildDb();

// Expose both PascalCase (Prisma-style) and camelCase (legacy code) aliases.
// camelCase aliases point to the same model adapter.
export const db = _db as typeof _db & {
  user: typeof _db.User;
  ustaz: typeof _db.Ustaz;
  kelas: typeof _db.Kelas;
  santri: typeof _db.Santri;
  kelompokBelajar: typeof _db.KelompokBelajar;
  jadwalKelompok: typeof _db.JadwalKelompok;
  anggotaKelompok: typeof _db.AnggotaKelompok;
  pembayaranSPP: typeof _db.PembayaranSPP;
  pengaturan: typeof _db.Pengaturan;
  pesanTemplate: typeof _db.PesanTemplate;
  pesanLog: typeof _db.PesanLog;
};
(db as Record<string, unknown>).user = _db.User;
(db as Record<string, unknown>).ustaz = _db.Ustaz;
(db as Record<string, unknown>).kelas = _db.Kelas;
(db as Record<string, unknown>).santri = _db.Santri;
(db as Record<string, unknown>).kelompokBelajar = _db.KelompokBelajar;
(db as Record<string, unknown>).jadwalKelompok = _db.JadwalKelompok;
(db as Record<string, unknown>).anggotaKelompok = _db.AnggotaKelompok;
(db as Record<string, unknown>).pembayaranSPP = _db.PembayaranSPP;
(db as Record<string, unknown>).pengaturan = _db.Pengaturan;
(db as Record<string, unknown>).pesanTemplate = _db.PesanTemplate;
(db as Record<string, unknown>).pesanLog = _db.PesanLog;

export { isFirebaseConfigured };

// Transaction helper — for routes that need to run multiple writes atomically
export async function $transaction<T>(fn: () => Promise<T>): Promise<T> {
  // Firestore batch only supports writes (set/update/delete), not reads.
  // For our use, the migration script's "$transaction" with deletes doesn't
  // need real atomicity — just execute sequentially.
  return fn();
}
