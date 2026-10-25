/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Production seed script — run after Vercel deploy to populate fresh database.
 *
 * Usage (locally to test against prod DB):
 *   DATABASE_URL="postgresql://..." bun run seed
 *
 * Or hit the API endpoint after deploy:
 *   curl -X POST https://your-app.vercel.app/api/seed
 */
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

const USERS_SEED = [
  { username: "admin", password: "admin123", name: "Administrator", role: "admin", email: "admin@annahl.sch.id", phone: "081234560000", active: true },
  { username: "bendahara", password: "bendahara123", name: "Bendahara Utama", role: "bendahara", email: "bendahara@annahl.sch.id", phone: "081234560001", active: true },
  { username: "pengelola", password: "pengelola123", name: "Pengelola Santri", role: "pengelola", email: "pengelola@annahl.sch.id", phone: "081234560002", active: true },
];

const KELAS_SEED = [
  { nama: "Kelas Iqra 1", tingkat: "Iqra", kapasitas: 15, keterangan: "Pengenalan huruf hijaiyah" },
  { nama: "Kelas Iqra 2", tingkat: "Iqra", kapasitas: 15, keterangan: "Lanjutan Iqra" },
  { nama: "Kelas Tahsin Anak", tingkat: "Tahsin", kapasitas: 20, keterangan: "Perbaikan bacaan" },
  { nama: "Kelas Tahfidz Juz 30", tingkat: "Tahfidz", kapasitas: 12, keterangan: "Hafalan Juz 30" },
  { nama: "Kelas Tahfidz Juz 29", tingkat: "Tahfidz", kapasitas: 12, keterangan: "Hafalan Juz 29" },
  { nama: "Kelas Tadarus", tingkat: "Tadarus", kapasitas: 25, keterangan: "Tadarus Quran" },
];

const USTAZ_SEED = [
  { nama: "Ust. Ahmad Fauzi, Lc.", jenisKelamin: "L", spesialisasi: "Tahfidz", noHp: "081234567001", email: "ahmad.fauzi@annahl.sch.id" },
  { nama: "Ust. Abdullah Hakim, S.Pd.I", jenisKelamin: "L", spesialisasi: "Tahsin", noHp: "081234567002", email: "abdullah.hakim@annahl.sch.id" },
  { nama: "Ust. Ibrahim Maulana, Lc.", jenisKelamin: "L", spesialisasi: "Tajwid", noHp: "081234567003", email: "ibrahim.m@annahl.sch.id" },
  { nama: "Ust. Yusuf Akbar, S.Pd.I", jenisKelamin: "L", spesialisasi: "Tadarus", noHp: "081234567004", email: "yusuf.akbar@annahl.sch.id" },
  { nama: "Ust. Hamzah Siddiq, Lc.", jenisKelamin: "L", spesialisasi: "Tafsir", noHp: "081234567005", email: "hamzah.siddiq@annahl.sch.id" },
  { nama: "Usth. Khadijah Rahman, S.Pd.I", jenisKelamin: "P", spesialisasi: "Tahfidz", noHp: "081234567006", email: "khadijah.r@annahl.sch.id" },
  { nama: "Usth. Maryam Salma, S.Pd.I", jenisKelamin: "P", spesialisasi: "Iqra", noHp: "081234567007", email: "maryam.salma@annahl.sch.id" },
  { nama: "Usth. Aisyah Nur, Lc.", jenisKelamin: "P", spesialisasi: "Tahsin", noHp: "081234567008", email: "aisyah.nur@annahl.sch.id" },
];

async function main() {
  console.log("=== Seeding database ===");

  // 1. Users
  for (const u of USERS_SEED) {
    await db.user.upsert({
      where: { username: u.username },
      update: u,
      create: u,
    });
  }
  console.log(`✓ ${USERS_SEED.length} users`);

  // 2. Ustaz
  const existingUstaz = await db.ustaz.count();
  let ustazIds = [];
  if (existingUstaz === 0) {
    for (let idx = 0; idx < USTAZ_SEED.length; idx++) {
      const u = USTAZ_SEED[idx];
      const created = await db.ustaz.create({
        data: { ...u, nip: `UST-${String(idx + 1).padStart(3, "0")}`, tanggalMasuk: new Date(2023, 0, 15), status: "aktif" },
      });
      ustazIds.push(created.id);
    }
  } else {
    ustazIds = (await db.ustaz.findMany({ select: { id: true } })).map((u) => u.id);
  }
  console.log(`✓ ${ustazIds.length} ustaz`);

  // 3. Kelas
  const existingKelas = await db.kelas.count();
  let kelasIds = [];
  if (existingKelas === 0) {
    for (let idx = 0; idx < KELAS_SEED.length; idx++) {
      const k = KELAS_SEED[idx];
      const created = await db.kelas.create({
        data: { ...k, ustazId: ustazIds[idx % ustazIds.length] },
      });
      kelasIds.push(created.id);
    }
  } else {
    kelasIds = (await db.kelas.findMany({ select: { id: true } })).map((k) => k.id);
  }
  console.log(`✓ ${kelasIds.length} kelas`);

  // 4. Santri (target 85)
  const FIRST_NAMES_M = ["Ahmad", "Muhammad", "Abdullah", "Abdurrahman", "Umar", "Ali", "Hamzah", "Bilal", "Zaid", "Yusuf", "Ibrahim", "Ismail", "Aqil", "Faiz", "Rizky", "Fahri", "Hanif", "Nabil", "Zaki", "Ridho", "Sultan", "Arsyad", "Naufal", "Daffa", "Ghazali", "Hafidz", "Ihsan", "Jibril"];
  const FIRST_NAMES_F = ["Aisyah", "Fatimah", "Khadijah", "Maryam", "Hafsah", "Zainab", "Sumayyah", "Hana", "Nabila", "Salsabila", "Alya", "Hanina", "Khalisa", "Mutiara", "Najwa", "Rahma", "Salma", "Zahra", "Afra", "Bunga", "Citra", "Dinda", "Elina", "Farah", "Ghaida", "Haura"];
  const LAST_NAMES = ["Pratama", "Saputra", "Hidayat", "Maulana", "Fauzan", "Wijaya", "Nugroho", "Ramadhan", "Akbar", "Putra", "Hakim", "Siddiq", "Farooq", "Ansari", "Rahman", "Kurnia", "Maulid", "Hasan", "Syaifuddin", "Anwar"];

  const existingSantri = await db.santri.count();
  if (existingSantri < 85) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    for (let i = existingSantri; i < 85; i++) {
      const useFemale = i % 3 === 0;
      const first = useFemale ? FIRST_NAMES_F[i % FIRST_NAMES_F.length] : FIRST_NAMES_M[i % FIRST_NAMES_M.length];
      const last = LAST_NAMES[(i + 7) % LAST_NAMES.length];
      const kelasIdx = i % kelasIds.length;
      await db.santri.create({
        data: {
          nis: `${curYear}${String(i + 1).padStart(4, "0")}`,
          nama: `${first} ${last}`,
          jenisKelamin: useFemale ? "P" : "L",
          kelasId: kelasIds[kelasIdx],
          sppBulanan: [100000, 120000, 150000, 175000, 200000][i % 5],
          tanggalMasuk: new Date(curYear - (i % 2), Math.max(0, curMonth - (i % 6)), 10),
          status: i % 17 === 0 ? "nonaktif" : "aktif",
          noHpOrtu: `0812${String(34560000 + i * 7).slice(0, 8)}`,
          namaAyah: `Bapak ${FIRST_NAMES_M[(i + 3) % FIRST_NAMES_M.length]} ${LAST_NAMES[(i + 2) % LAST_NAMES.length]}`,
          namaIbu: `Ibu ${FIRST_NAMES_F[(i + 5) % FIRST_NAMES_F.length]} ${LAST_NAMES[(i + 4) % LAST_NAMES.length]}`,
          tanggalLahir: new Date(curYear - (6 + (i % 8)), i % 12, (i % 27) + 1),
        },
      });
    }
  }
  const santriCount = await db.santri.count();
  console.log(`✓ ${santriCount} santri`);

  console.log("\n=== Seed complete ===");
  console.log("Login dengan: admin / admin123");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
