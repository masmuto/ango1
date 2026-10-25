import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const kelasId = searchParams.get("kelasId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (kelasId && kelasId !== "all") where.kelasId = kelasId;
    if (q) {
      where.OR = [
        { nama: { contains: q } },
        { nis: { contains: q } },
        { namaAyah: { contains: q } },
        { namaIbu: { contains: q } },
      ];
    }

    const santri = await db.santri.findMany({
      where,
      include: { kelas: { select: { id: true, nama: true, tingkat: true } } },
      orderBy: { nama: "asc" },
      take: 500,
    });

    return NextResponse.json({ data: serialize(santri) });
  } catch (err) {
    console.error("[santri GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat data santri" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const count = await db.santri.count();
    const nis = body.nis || `S${String(Date.now()).slice(-6)}${count}`;

    const santri = await db.santri.create({
      data: {
        nis,
        nama: body.nama,
        jenisKelamin: body.jenisKelamin || "L",
        tempatLahir: body.tempatLahir || null,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        alamat: body.alamat || null,
        namaAyah: body.namaAyah || null,
        namaIbu: body.namaIbu || null,
        noHpOrtu: body.noHpOrtu || null,
        kelasId: body.kelasId || null,
        tanggalMasuk: body.tanggalMasuk ? new Date(body.tanggalMasuk) : new Date(),
        status: body.status || "aktif",
        catatan: body.catatan || null,
        sppBulanan: Number(body.sppBulanan) || 150000,
      },
      include: { kelas: { select: { id: true, nama: true, tingkat: true } } },
    });

    return NextResponse.json({ data: serialize(santri) }, { status: 201 });
  } catch (err) {
    console.error("[santri POST] error:", err);
    return NextResponse.json({ error: "Gagal menambah santri" }, { status: 500 });
  }
}
