import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { getCurrentYearMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan");
    const q = searchParams.get("q")?.trim();

    const where: Record<string, unknown> = {};
    if (bulan) where.bulan = bulan;
    if (q) {
      where.santri = {
        OR: [
          { nama: { contains: q } },
          { nis: { contains: q } },
        ],
      };
    }

    const pembayaran = await db.pembayaranSPP.findMany({
      where,
      include: {
        santri: {
          select: {
            id: true,
            nis: true,
            nama: true,
            noHpOrtu: true,
            namaAyah: true,
            kelas: { select: { id: true, nama: true } },
            sppBulanan: true,
          },
        },
      },
      orderBy: { tanggalBayar: "desc" },
      take: 500,
    });

    return NextResponse.json({ data: serialize(pembayaran) });
  } catch (err) {
    console.error("[pembayaran GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat pembayaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bulan = body.bulan || getCurrentYearMonth();
    const santri = await db.santri.findUnique({
      where: { id: body.santriId },
      select: { id: true, nis: true, nama: true, noHpOrtu: true, namaAyah: true, sppBulanan: true, kelas: { select: { nama: true } } },
    });
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 });

    const jumlah = Number(body.jumlah) || santri.sppBulanan;
    const count = await db.pembayaranSPP.count();
    const noPembayaran = `SPP-${bulan.replace("-", "")}-${String(count + 1).padStart(4, "0")}`;

    const pembayaran = await db.pembayaranSPP.create({
      data: {
        noPembayaran,
        santriId: body.santriId,
        bulan,
        jumlah,
        tanggalBayar: body.tanggalBayar ? new Date(body.tanggalBayar) : new Date(),
        metodePembayaran: body.metodePembayaran || "tunai",
        status: body.status || "lunas",
        keterangan: body.keterangan || null,
        diterimaOleh: body.diterimaOleh || null,
      },
      include: {
        santri: {
          select: {
            id: true,
            nis: true,
            nama: true,
            noHpOrtu: true,
            namaAyah: true,
            kelas: { select: { id: true, nama: true } },
            sppBulanan: true,
          },
        },
      },
    });

    return NextResponse.json({ data: serialize(pembayaran) }, { status: 201 });
  } catch (err) {
    console.error("[pembayaran POST] error:", err);
    return NextResponse.json({ error: "Gagal mencatat pembayaran" }, { status: 500 });
  }
}
