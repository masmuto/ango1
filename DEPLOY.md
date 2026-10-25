# Deploy ke Vercel — Panduan

Aplikasi GO An Nahl sudah dikonfigurasi untuk deploy ke Vercel. Ikuti langkah-langkah berikut.

## Penyebab Error 500 Sebelumnya

Vercel serverless functions tidak bisa:
1. **Membaca file dari filesystem** (`readFileSync`, `existsSync`) — sudah diperbaiki
2. **Mengakses SQLite file-based database** — Vercel butuh Postgres
3. **Generate Prisma Client otomatis** — sudah diperbaiki via `postinstall`

## Langkah 1: Buat Database Postgres Gratis

Pilih salah satu (semua punya free tier):

### Opsi A: Neon (paling simpel untuk Vercel)
1. Daftar di https://neon.tech
2. Buat project baru → salin connection string
   Format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

### Opsi B: Vercel Postgres Marketplace
1. Buka https://vercel.com/marketplace → cari "Postgres"
2. Install (misalnya Prisma Postgres atau Neon)
3. Connection string otomatis di-inject sebagai `DATABASE_URL`

### Opsi C: Supabase
1. Buat project di https://supabase.com
2. Project Settings → Database → Connection string → URI
3. Salin ke Vercel env vars

## Langkah 2: Set Environment Variables di Vercel

Buka project Vercel → Settings → Environment Variables, lalu tambahkan semua variable berikut:

### Wajib:
| Variable | Value | Catatan |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Dari Neon/Supabase (Langkah 1) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyDLiHiKASzzStEhToaEKQ3rs4D7OZ7cx2Y` | Hardcoded di code juga |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `dompetku-300ae.firebaseapp.com` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `dompetku-300ae` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `dompetku-300ae.firebasestorage.app` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `1008213102945` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:1008213102945:web:706e9304b20fb7f8cc7520` | |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BCOon_Sy8-RLZD15LTygmQfOoEviH7SssyQ1-G9ibpz1DeuW5KCpPBWBDICBrux7gwfinsVPEVwrKLYnzdO5NOQ` | Untuk PWA push |
| `VAPID_PRIVATE_KEY` | `7U5FSEpKVREwTnkiANJZrODcrGUNuUj3UpeqXkbS0Dw` | Untuk PWA push |

### Opsional (jika ingin Firestore server-side):
| Variable | Value |
|---|---|
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@dompetku-300ae.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` (paste multi-line as-is) |

**Tip**: Untuk semua environment variables, pilih target **Production**, **Preview**, dan **Development** supaya semua deploy dapat config yang sama.

## Langkah 3: Deploy

### Cara 1: Via Vercel Dashboard (paling mudah)
1. Push project ke GitHub
2. Buka https://vercel.com/new → import repo
3. Vercel otomatis detect Next.js
4. Pastikan Build Command: `node scripts/set-provider.js && prisma generate && prisma db push --accept-data-loss && next build` (sudah ada di `vercel.json`)
5. Klik **Deploy**

### Cara 2: Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel link  # sekali saja
vercel env pull .env.local  # tarik env vars dari Vercel ke lokal
vercel --prod  # deploy
```

## Langkah 4: Inisialisasi Data (Sekali setelah deploy pertama)

Setelah deploy sukses, database masih kosong. Jalankan seed:

```bash
# Ganti dengan URL Vercel Anda
curl -X POST https://appannhalku8.vercel.app/api/seed
```

Atau buka URL ini di browser:
```
https://appannhalku8.vercel.app/api/seed (method POST via curl/Postman)
```

Response yang sukses:
```json
{
  "ok": true,
  "summary": {
    "users": 3,
    "ustaz": 8,
    "kelas": 6,
    "santri": 85,
    "pembayaran": 56,
    "pesanTemplate": 3
  }
}
```

## Langkah 5: Buat Akun Firebase Auth

Jalankan inisialisasi Firebase Auth (membuat admin@annahl.sch.id dll. di Firebase Auth):

```bash
curl -X POST https://appannhalku8.vercel.app/api/firebase/init
```

Pastikan dulu **Email/Password sign-in** sudah diaktifkan di:
https://console.firebase.google.com/project/dompetku-300ae/authentication/providers

## Langkah 6: Verifikasi Login

Buka https://appannhalku8.vercel.app → login dengan:
- Username: `admin`, Password: `admin123`
- Username: `bendahara`, Password: `bendahara123`
- Username: `pengelola`, Password: `pengelola123`

## Troubleshooting

### Error: "Prisma cannot find client"
Pastikan env var `DATABASE_URL` sudah diset di Vercel. Lalu **Redeploy** (bukan sekadar save env vars — perlu trigger build baru).

### Error: "Database connection refused" atau "sslmode"
Tambahkan `?sslmode=require` di akhir DATABASE_URL:
```
postgresql://user:pass@host/db?sslmode=require
```

### Error: "P1012: Provider sqlite is not available"
Provider auto-detected dari DATABASE_URL. Pastikan DATABASE_URL dimulai dengan `postgresql://` (bukan `file:`). Script `scripts/set-provider.js` otomatis switch.

### Login masih 500 setelah semua di-set
Cek Vercel logs (Dashboard → project → Logs). Error paling umum:
- `PrismaClientInitializationError` → DATABASE_URL salah / DB belum dibuat
- `FirebaseAuthError` → Email/Password sign-in belum diaktifkan di Firebase Console

### Cara rollback ke commit sebelumnya
Di Vercel Dashboard → Deployments → pilih deployment lama → klik **"Instant Rollback"**

## File Penting untuk Vercel

| File | Fungsi |
|---|---|
| `vercel.json` | Konfigurasi build command + region |
| `scripts/set-provider.js` | Auto-detect sqlite vs postgresql berdasarkan DATABASE_URL |
| `scripts/seed-prod.js` | Seed data ke database production |
| `prisma/schema.prisma` | Schema dengan `binaryTargets` untuk Vercel Linux |
| `src/lib/firebase-config.ts` | Config Firebase hardcoded (fallback kalau env vars hilang) |
| `next.config.ts` | Headers untuk Service Worker + manifest |
| `public/sw.js` | Service Worker statis (tidak butuh webpack) |
| `public/manifest.webmanifest` | PWA manifest |

## Test Lokal dengan Postgres (opsional)

Ingin test setup yang sama dengan Vercel sebelum deploy?

```bash
# Set DATABASE_URL ke Neon/Supabase
export DATABASE_URL="postgresql://..."

# Build & start
bun run build
bun run start

# Atau test dengan dev server
bun run dev

# Seed data
bun run seed
```
