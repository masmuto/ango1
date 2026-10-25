import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { getCurrentYearMonth, getMonthRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan") || getCurrentYearMonth();

    const [santriAktif, santriTotal, ustazTotal, kelasTotal, pembayaranThisMonth, recent, tunggakanList] =
      await Promise.all([
        db.santri.count({ where: { status: "aktif" } }),
        db.santri.count(),
        db.ustaz.count(),
        db.kelas.count(),
        db.pembayaranSPP.findMany({
          where: {
            bulan,
            status: "lunas",
          },
        }),
        db.pembayaranSPP.findMany({
          take: 8,
          orderBy: { tanggalBayar: "desc" },
          include: { santri: { select: { nama: true, nis: true } } },
        }),
        db.santri.findMany({
          where: { status: "aktif" },
          select: {
            id: true,
            nis: true,
            nama: true,
            sppBulanan: true,
            kelas: { select: { nama: true } },
          },
        }),
      ]);

    const sppThisMonth = pembayaranThisMonth.reduce((s, p) => s + p.jumlah, 0);
    const paidSantriIds = new Set(pembayaranThisMonth.map((p) => p.santriId));
    const expectedThisMonth = santriAktif * 150000; // nominal default
    const unpaidCount = santriAktif - paidSantriIds.size;
    const collectionRate = expectedThisMonth > 0 ? Math.round((sppThisMonth / expectedThisMonth) * 100) : 0;

    // Trend: last 6 months
    const months = getMonthRange(5);
    const trendRaw = await db.pembayaranSPP.groupBy({
      by: ["bulan"],
      where: { bulan: { in: months }, status: "lunas" },
      _sum: { jumlah: true },
      _count: true,
    });
    const trendMap = new Map(trendRaw.map((t) => [t.bulan, t]));
    const trend = months.map((m) => {
      const t = trendMap.get(m);
      return {
        bulan: m,
        label: m,
        total: t?._sum.jumlah ?? 0,
        count: t?._count ?? 0,
      };
    });

    // Per-kelas santri count
    const kelasWithCount = await db.kelas.findMany({
      select: {
        nama: true,
        _count: { select: { santri: { where: { status: "aktif" } } } },
      },
    });
    const kelasStats = kelasWithCount.map((k) => ({ nama: k.nama, jumlah: k._count.santri }));

    const tunggakan = tunggakanList
      .filter((s) => !paidSantriIds.has(s.id))
      .slice(0, 8)
      .map((s) => ({
        id: s.id,
        nis: s.nis,
        nama: s.nama,
        kelas: s.kelas,
        sppBulanan: s.sppBulanan,
      }));

    return NextResponse.json({
      data: serialize({
        totals: {
          santri: santriTotal,
          santriAktif,
          ustaz: ustazTotal,
          kelas: kelasTotal,
          sppThisMonth,
          expectedThisMonth,
          collectionRate,
          paidCount: paidSantriIds.size,
          unpaidCount,
        },
        trend,
        kelasStats,
        recent,
        tunggakan,
        bulan,
      }),
    });
  } catch (err) {
    console.error("[dashboard] error:", err);
    return NextResponse.json({ error: "Gagal memuat dashboard" }, { status: 500 });
  }
}
