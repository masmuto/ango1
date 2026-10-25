# GO An Nahl — Rumah Tahfidz

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Config-FFCA28?logo=firebase)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sistem Manajemen Santri & SPP Rumah Tahfidz An Nahl. Platform terpadu untuk pengelolaan data santri, pembayaran SPP, jadwal pembelajaran, dan laporan keuangan.

## ✨ Fitur

- **Dashboard** — Statistik & ringkasan harian (total santri, SPP bulan ini, koleksi rate, tunggakan)
- **Data Santri** — CRUD lengkap dengan filter (kelas, status), search, detail view
- **Data Ustaz/Ustazah** — Manajemen pengajar dengan spesialisasi
- **Kelas** — Multi-tingkat (Iqra, Tahsin, Tahfidz, Tadarus, Tajwid, Tafsir)
- **Kelompok Belajar** — Kelompok terjadwal dengan jadwal harian + anggota
- **Pembayaran SPP** — Pencatatan dengan bukti QR code + kirim WhatsApp otomatis
- **Laporan** — Matriks bulanan + summary tunggakan per santri
- **Manajemen User** — 3 role (admin, bendahara, pengelola) dengan permission
- **Pesan WhatsApp** — Template + log pengiriman
- **Database** — Backup/restore JSON, reset dengan opsi keep users
- **PWA** — Installable ke home screen, offline-ready, push notifications
- **Firebase Auth** — Login terintegrasi dengan Firebase Authentication
- **Responsive** — Mobile-first, bottom nav di mobile, sidebar di desktop

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | Tailwind CSS 4 + shadcn/ui (New York style) |
| Icons | Lucide React |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| State | Zustand + TanStack Query |
| Database | Prisma ORM (SQLite untuk dev, Postgres untuk Vercel) |
| Auth | Firebase Authentication (REST API) |
| PWA | Custom Service Worker + Web Push (VAPID) |
| Notifications | Web Push API (server-side via `web-push` library) |

## 📦 Quick Start (Local Dev)

### Prerequisites

- Node.js 20+ atau Bun 1.0+
- Database (SQLite untuk dev lokal — auto-create)

### Install & Run

```bash
# Clone repo
git clone https://github.com/USERNAME/go-an-nahl.git
cd go-an-nahl

# Install dependencies
bun install  # atau: npm install / pnpm install

# Copy env template
cp .env.example .env
# Edit .env — minimal DATABASE_URL (default SQLite sudah diset)

# Generate Prisma client + create DB schema
bun run db:push

# Seed data demo (3 user, 8 ustaz, 6 kelas, 85 santri, 56 pembayaran)
bun run seed

# Run dev server
bun run dev
```

Buka http://localhost:3000

### Login Demo (3 akun)

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator (akses penuh) |
| `bendahara` | `bendahara123` | Bendahara (pembayaran & laporan) |
| `pengelola` | `pengelola123` | Pengelola (santri, ustaz, kelas) |

## 🚀 Deploy ke Vercel

Lihat panduan lengkap di [DEPLOY.md](DEPLOY.md). Singkatnya:
1. Buat database Postgres (Neon / Supabase / Vercel Marketplace)
2. Set env vars di Vercel Project Settings (lihat tabel di DEPLOY.md)
3. Push ke GitHub → Vercel auto-deploy (build command sudah ada di `vercel.json`)
4. Setelah deploy, jalankan:
   ```bash
   curl -X POST https://your-app.vercel.app/api/seed
   curl -X POST https://your-app.vercel.app/api/firebase/init
   ```
5. Login dengan `admin / admin123`

## 🔥 Setup Firebase (Opsional — login tetap jalan dengan fallback ke local password)

1. Buat project di https://console.firebase.google.com
2. Add web app → copy config ke `.env` (atau hardcode di `src/lib/firebase-config.ts`)
3. Authentication → Sign-in method → **Enable Email/Password**
4. (Opsional) Project Settings → Service Accounts → Generate new private key
   Set `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` di env vars (untuk Firestore server-side)
5. Klik **"Inisialisasi Akun Auth"** di menu Koneksi Firebase app
   (Atau: `curl -X POST https://your-app/api/firebase/init`)

## 📱 PWA Setup

App sudah dilengkapi PWA (manifest + service worker + push notifications). Setelah deploy:

1. Buka app di Chrome/Edge → akan muncul tombol **"Pasang"** di address bar
2. Klik Pasang → app jadi icon di home screen / taskbar
3. Login → menu Profil Saya → klik **"Aktifkan Notifikasi"** untuk enable push notification
4. VAPID keys sudah di-generate dan ada di `.env` (regenerate dengan: `node -e "console.log(require('web-push').generateVAPIDKeys())"`)

## 📁 Struktur Project

```
go-an-nahl/
├── prisma/
│   └── schema.prisma              # 12 model: User, Santri, Ustaz, Kelas, ...
├── public/
│   ├── manifest.webmanifest       # PWA manifest
│   ├── sw.js                      # Service Worker (push + caching)
│   ├── icon-*.png                 # App icons (192, 512, maskable, apple-touch)
│   └── favicon.ico
├── scripts/
│   ├── set-provider.js            # Auto-detect sqlite vs postgresql dari DATABASE_URL
│   ├── gen-icons.js               # Regenerate PWA icons dari icon-source.svg
│   ├── icon-source.svg            # Source SVG untuk icon
│   └── seed-prod.js               # Seed data untuk production
├── src/
│   ├── app/
│   │   ├── api/                   # 41 API routes (auth, dashboard, santri, dll.)
│   │   ├── layout.tsx             # Root layout + metadata PWA
│   │   ├── page.tsx               # Renders AppShell
│   │   └── globals.css            # Islamic green theme + dark mode
│   ├── components/
│   │   ├── ui/                    # 40+ shadcn/ui components
│   │   ├── views/                 # 14 view components (dashboard, santri, dll.)
│   │   ├── app-shell.tsx          # Main app shell + routing
│   │   ├── sidebar.tsx            # Desktop sidebar nav
│   │   ├── topbar.tsx             # Top bar with mobile menu
│   │   ├── bottom-nav.tsx         # Mobile bottom navigation
│   │   ├── pwa-controls.tsx       # Install banner + push toggle
│   │   ├── an-nahl-logo.tsx       # Logo component
│   │   └── bukti-pembayaran.tsx   # Receipt with QR
│   ├── lib/
│   │   ├── firebase-config.ts     # Firebase config (hardcoded fallback)
│   │   ├── firebase-admin.ts      # Admin SDK init (Vercel-compatible)
│   │   ├── firestore-db.ts        # Firestore wrapper (Prisma-like API)
│   │   ├── pwa-client.ts         # SW register + push subscribe
│   │   ├── auth.ts               # Session user type + role helpers
│   │   ├── format.ts             # formatRupiah, formatDate, getMonthLabel
│   │   ├── session-store.ts      # Zustand session store
│   │   ├── use-app-nav.ts        # View navigation hook
│   │   ├── safe-fetch.ts         # Fetch wrapper with timeout
│   │   ├── serialize.ts          # Date serialization helper
│   │   ├── db.ts                 # Prisma client singleton
│   │   └── utils.ts              # cn() Tailwind helper
│   └── hooks/
│       ├── use-mobile.ts
│       └── use-toast.ts
├── .env.example                   # Template env vars (copy ke .env)
├── .gitignore
├── vercel.json                    # Vercel build config
├── next.config.ts                 # Next.js config (PWA headers)
├── tailwind.config.ts
├── tsconfig.json
├── package.json                   # postinstall: prisma generate
├── DEPLOY.md                      # Panduan deploy ke Vercel
└── README.md                      # File ini
```

## 🔧 Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server di http://localhost:3000 |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | ESLint check |
| `bun run db:push` | Push Prisma schema ke DB (auto-detect provider) |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run migrations |
| `bun run seed` | Seed data demo (85 santri, 8 ustaz, 6 kelas) |
| `node scripts/gen-icons.js` | Regenerate PWA icons dari SVG source |

## 🎨 Tema

Islamic green theme (oklch hue 150) — primary `#2D6A4F`, dark variant `#1B4332`. Mendukung light & dark mode (auto via `prefers-color-scheme`).

## 🔐 Keamanan

- Password di-hash via Firebase Auth (bukan plaintext di DB) — dengan fallback ke local password jika Firebase belum dikonfigurasi
- HTTP-only session cookie (7 hari)
- Row Level Security rules Firestore (jika pakai Firestore)
- Input validation via Zod di API routes yang kritis

## 🤝 Kontribusi

Pull request welcome! Untuk perubahan besar, buka issue dulu untuk diskusi.

## 📦 Build Release Package

Untuk pack source code menjadi zip siap-push-ke-git, jalankan:

```bash
node scripts/build-release.js
```

Akan menghasilkan `download/go-an-nahl-v{VERSION}.zip` dengan struktur bersih (tanpa node_modules, build artifacts, atau secrets).

### Push ke GitHub setelah extract zip:

**Cara otomatis (recommended):**
```bash
unzip go-an-nahl-v0.2.1.zip -d go-an-nahl
cd go-an-nahl
./scripts/init-git.sh                                    # buat repo baru via gh CLI
# atau
./scripts/init-git.sh https://github.com/USER/REPO.git   # push ke repo existing
```

**Cara manual:**
```bash
unzip go-an-nahl-v0.2.1.zip -d go-an-nahl
cd go-an-nahl
git init -b main
git add .
git commit -m "Initial commit: GO An Nahl"
git remote add origin https://github.com/USERNAME/go-an-nahl.git
git push -u origin main
```

## 📄 License

MIT — lihat [LICENSE](LICENSE).

## 🙏 Credits

Dibangun untuk Rumah Tahfidz An Nahl dengan ❤️

---

**Bersama Al-Qur'an membangun generasi Qur'ani**
