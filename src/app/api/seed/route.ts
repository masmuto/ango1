import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentYearMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIRST_NAMES_M = ["Ahmad", "Muhammad", "Abdullah", "Abdurrahman", "Umar", "Ali", "Hamzah", "Bilal", "Zaid", "Yusuf", "Ibrahim", "Ismail", "Aqil", "Faiz", "Rizky", "Fahri", "Hanif", "Nabil", "Zaki", "Ridho", "Sultan", "Arsyad", "Naufal", "Daffa", "Ghazali", "Hafidz", "Ihsan", "Jibril", "Kayla", "Luthfi"];
const FIRST_NAMES_F = ["Aisyah", "Fatimah", "Khadijah", "Maryam", "Hafsah", "Zainab", "Sumayyah", "Hana", "Nabila", "Salsabila", "Alya", "Hanina", "Khalisa", "Mutiara", "Najwa", "Rahma", "Salma", "Zahra", "Afra", "Bunga", "Citra", "Dinda", "Elina", "Farah", "Ghaida", "Haura", "Indah"];
const LAST_NAMES = ["Pratama", "Saputra", "Hidayat", "Maulana", "Fauzan", "Wijaya", "Nugroho", "Ramadhan", "Akbar", "Putra", "Hakim", "Siddiq", "Farooq", "Ansari", "Rahman", "Kurnia", "Maulid", "Hasan", "Syaifuddin", "Anwar", "Rachman", "Santoso", "Wibowo", "Halim"];

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

const USERS_SEED = [
  { username: "admin", password: "admin123", name: "Administrator", role: "admin", email: "admin@annahl.sch.id", phone: "081234560000", active: true },
  { username: "bendahara", password: "bendahara123", name: "Bendahara Utama", role: "bendahara", email: "bendahara@annahl.sch.id", phone: "081234560001", active: true },
  { username: "pengelola", password: "pengelola123", name: "Pengelola Santri", role: "pengelola", email: "pengelola@annahl.sch.id", phone: "081234560002", active: true },
];

const PESAN_TEMPLATES = [
  { kode: "SPP-LUNAS", nama: "Konfirmasi Pembayaran SPP Lunas", kategori: "pembayaran", aktif: true, isi: "Assalamualaikum Wr. Wb.\n\nKami informasikan bahwa pembayaran SPP ananda *{nama_santri}* (NIS: {nis}) untuk bulan *{bulan}* sebesar *{jumlah}* telah kami terima dan berstatus *LUNAS*.\n\nNo. Pembayaran: {no_pembayaran}\nTanggal: {tanggal}\n\nTerima kasih.\n\nWassalamualaikum Wr. Wb.\nRumah Tahfidz An Nahl" },
  { kode: "SPP-REMINDER", nama: "Pengingat Pembayaran SPP", kategori: "pembayaran", aktif: true, isi: "Assalamualaikum Wr. Wb.\n\nYth. Orang Tua/Wali dari ananda *{nama_santri}* (NIS: {nis}),\n\nKami informasikan bahwa SPP bulan *{bulan}* belum kami terima. Mohon untuk segera melakukan pembayaran sebesar *{jumlah}*.\n\nTerima kasih atas perhatiannya.\n\nWassalamualaikum Wr. Wb.\nRumah Tahfidz An Nahl" },
  { kode: "DAFTAR-SANTRI", nama: "Selamat Datang Santri Baru", kategori: "umum", aktif: true, isi: "Assalamualaikum Wr. Wb.\n\nSelamat datang ananda *{nama_santri}* di Rumah Tahfidz An Nahl! Semoga Allah memudahkan perjalanan tahfidz ananda.\n\nBerikut detail pendaftaran:\nNIS: {nis}\nKelas: {kelas}\n\nWassalamualaikum Wr. Wb." },
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function generateName(i: number): { nama: string; jenisKelamin: string } {
  const useFemale = i % 3 === 0; // ~33% female
  const first = useFemale ? pick(FIRST_NAMES_F, i) : pick(FIRST_NAMES_M, i);
  const last = pick(LAST_NAMES, i + 7);
  return { nama: `${first} ${last}`, jenisKelamin: useFemale ? "P" : "L" };
}

export async function POST() {
  try {
    const userCount = await db.user.count();
    if (userCount > 0) {
      // Seed remaining data only; users already exist
    }

    // 1. Users (upsert so re-seeding doesn't fail)
    for (const u of USERS_SEED) {
      await db.user.upsert({
        where: { username: u.username },
        update: { password: u.password, name: u.name, role: u.role, email: u.email, phone: u.phone, active: true },
        create: u,
      });
    }

    // 2. Ustaz
    const existingUstaz = await db.ustaz.count();
    let ustazIds: string[] = [];
    if (existingUstaz === 0) {
      const created = await Promise.all(
        USTAZ_SEED.map((u, idx) =>
          db.ustaz.create({
            data: {
              ...u,
              nip: `UST-${String(idx + 1).padStart(3, "0")}`,
              tanggalMasuk: new Date(2023, 0, 15),
              status: "aktif",
            },
          }),
        ),
      );
      ustazIds = created.map((u) => u.id);
    } else {
      ustazIds = (await db.ustaz.findMany({ select: { id: true } })).map((u) => u.id);
    }

    // 3. Kelas
    const existingKelas = await db.kelas.count();
    let kelasIds: string[] = [];
    if (existingKelas === 0) {
      const created = await Promise.all(
        KELAS_SEED.map((k, idx) =>
          db.kelas.create({
            data: {
              ...k,
              ustazId: ustazIds[idx % ustazIds.length],
            },
          }),
        ),
      );
      kelasIds = created.map((k) => k.id);
    } else {
      kelasIds = (await db.kelas.findMany({ select: { id: true } })).map((k) => k.id);
    }

    // 4. Santri (target ~85)
    const existingSantri = await db.santri.count();
    if (existingSantri < 85) {
      const target = 85;
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth(); // 0-11
      const currentYM = getCurrentYearMonth();

      const toCreate: Array<{
        nis: string; nama: string; jenisKelamin: string;
        kelasId: string; sppBulanan: number; tanggalMasuk: Date; status: string;
        noHpOrtu: string; namaAyah: string; namaIbu: string;
        tempatLahir: string; tanggalLahir: Date; alamat: string;
      }> = [];
      for (let i = existingSantri; i < target; i++) {
        const { nama, jenisKelamin } = generateName(i);
        const kelasIdx = i % kelasIds.length;
        const sppNominal = [100000, 120000, 150000, 175000, 200000][i % 5];
        const birthYear = curYear - (6 + (i % 8)); // 6-13 years old
        const birthMonth = i % 12;
        const birthDay = (i % 27) + 1;
        toCreate.push({
          nis: `${curYear}${String(i + 1).padStart(4, "0")}`,
          nama,
          jenisKelamin,
          kelasId: kelasIds[kelasIdx],
          sppBulanan: sppNominal,
          tanggalMasuk: new Date(curYear - (i % 2), Math.max(0, curMonth - (i % 6)), 10),
          status: i % 17 === 0 ? "nonaktif" : "aktif",
          noHpOrtu: `0812${String(34560000 + i * 7).slice(0, 8)}`,
          namaAyah: `Bapak ${pick(FIRST_NAMES_M, i + 3)} ${pick(LAST_NAMES, i + 2)}`,
          namaIbu: `Ibu ${pick(FIRST_NAMES_F, i + 5)} ${pick(LAST_NAMES, i + 4)}`,
          tempatLahir: pick(["Jakarta", "Bekasi", "Depok", "Tangerang", "Bogor", "Bandung", "Cirebon"], i),
          tanggalLahir: new Date(birthYear, birthMonth, birthDay),
          alamat: `Jl. Al-Quran No. ${i + 1}, RT 0${(i % 9) + 1}/RW 0${(i % 5) + 1}`,
        });
      }
      await db.santri.createMany({ data: toCreate });
    }

    // 5. Pembayaran SPP — fill current month for ~70% of active santri
    const santriForPay = await db.santri.findMany({ where: { status: "aktif" }, select: { id: true, sppBulanan: true } });
    const currentYM = getCurrentYearMonth();
    const existingPay = await db.pembayaranSPP.count({ where: { bulan: currentYM } });
    if (existingPay === 0) {
      const payers = santriForPay.filter((_, i) => i % 10 < 7); // 70%
      let counter = 1;
      const months = [currentYM];
      for (const m of months) {
        for (const s of payers) {
          const no = `SPP-${m.replace("-", "")}-${String(counter).padStart(4, "0")}`;
          counter++;
          await db.pembayaranSPP.create({
            data: {
              noPembayaran: no,
              santriId: s.id,
              bulan: m,
              jumlah: s.sppBulanan,
              tanggalBayar: new Date(),
              metodePembayaran: pick(["tunai", "transfer", "qris"], counter),
              status: "lunas",
              diterimaOleh: "Bendahara Utama",
            },
          });
        }
      }
    }

    // 6. Pesan templates
    const existingTpl = await db.pesanTemplate.count();
    if (existingTpl === 0) {
      for (const t of PESAN_TEMPLATES) {
        await db.pesanTemplate.create({ data: t });
      }
    }

    // 7. Default pengaturan
    const existingSet = await db.pengaturan.count();
    if (existingSet === 0) {
      const defaults = [
        { key: "nama_lembaga", value: "Rumah Tahfidz An Nahl" },
        { key: "alamat", value: "Jl. Al-Quran No. 1, Bekasi" },
        { key: "telepon", value: "021-12345678" },
        { key: "email", value: "info@annahl.sch.id" },
        { key: "tahun_ajaran", value: "2025/2026" },
        { key: "ketua", value: "Ust. Ahmad Fauzi, Lc." },
      ];
      for (const d of defaults) {
        await db.pengaturan.upsert({
          where: { key: d.key },
          update: {},
          create: { id: d.key, ...d },
        });
      }
    }

    const summary = {
      users: await db.user.count(),
      ustaz: await db.ustaz.count(),
      kelas: await db.kelas.count(),
      santri: await db.santri.count(),
      pembayaran: await db.pembayaranSPP.count(),
      pesanTemplate: await db.pesanTemplate.count(),
    };

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("[seed] error:", err);
    return NextResponse.json({ error: `Seed gagal: ${String(err)}` }, { status: 500 });
  }
}
