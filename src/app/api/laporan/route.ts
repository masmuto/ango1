import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { getCurrentYearMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${MONTH_LABELS[idx]} ${y}`;
}

function monthRange(start: string, end: string): string[] {
  const result: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startBulan = searchParams.get("startBulan") || getCurrentYearMonth();
    const endBulan = searchParams.get("endBulan") || getCurrentYearMonth();
    const kelasId = searchParams.get("kelasId");

    const months = monthRange(startBulan, endBulan);

    const santriWhere: Record<string, unknown> = { status: "aktif" };
    if (kelasId && kelasId !== "all") santriWhere.kelasId = kelasId;

    const santriList = await db.santri.findMany({
      where: santriWhere,
      include: { kelas: { select: { nama: true } } },
      orderBy: { nama: "asc" },
    });

    const pembayaran = await db.pembayaranSPP.findMany({
      where: {
        bulan: { in: months },
        status: "lunas",
        santriId: { in: santriList.map((s) => s.id) },
      },
    });

    const payMap = new Map<string, Map<string, number>>();
    for (const p of pembayaran) {
      if (!payMap.has(p.santriId)) payMap.set(p.santriId, new Map());
      payMap.get(p.santriId)!.set(p.bulan, p.jumlah);
    }

    const rows = santriList.map((s) => {
      const santriPay = payMap.get(s.id) ?? new Map<string, number>();
      const monthsData = months.map((m) => ({
        bulan: m,
        label: monthLabel(m),
        jumlah: santriPay.get(m) ?? 0,
        status: santriPay.has(m) ? "lunas" : "belum",
      }));
      const totalPaid = monthsData.reduce((sum, m) => sum + m.jumlah, 0);
      const totalExpected = s.sppBulanan * months.length;
      const tunggakan = Math.max(0, totalExpected - totalPaid);
      return {
        nis: s.nis,
        nama: s.nama,
        kelas: s.kelas?.nama || "-",
        sppBulanan: s.sppBulanan,
        months: monthsData,
        totalPaid,
        totalExpected,
        tunggakan,
        status: tunggakan > 0 ? "tunggakan" : "lunas",
      };
    });

    const summary = {
      totalSantri: rows.length,
      lunasCount: rows.filter((r) => r.status === "lunas").length,
      tunggakanCount: rows.filter((r) => r.status === "tunggakan").length,
      totalPaid: rows.reduce((s, r) => s + r.totalPaid, 0),
      totalExpected: rows.reduce((s, r) => s + r.totalExpected, 0),
      totalTunggakan: rows.reduce((s, r) => s + r.tunggakan, 0),
      months,
    };

    const kelasList = await db.kelas.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } });

    return NextResponse.json({
      data: serialize({ rows, summary, months }),
      kelas: serialize(kelasList),
    });
  } catch (err) {
    console.error("[laporan GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
