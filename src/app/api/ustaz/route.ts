import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (q) {
      where.OR = [
        { nama: { contains: q } },
        { nip: { contains: q } },
        { email: { contains: q } },
        { noHp: { contains: q } },
      ];
    }

    const ustaz = await db.ustaz.findMany({
      where,
      include: { kelas: { select: { id: true, nama: true } } },
      orderBy: { nama: "asc" },
      take: 500,
    });

    return NextResponse.json({ data: serialize(ustaz) });
  } catch (err) {
    console.error("[ustaz GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat data ustaz" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ustaz = await db.ustaz.create({
      data: {
        nip: body.nip || null,
        nama: body.nama,
        jenisKelamin: body.jenisKelamin || "L",
        tempatLahir: body.tempatLahir || null,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        alamat: body.alamat || null,
        noHp: body.noHp || null,
        email: body.email || null,
        spesialisasi: body.spesialisasi || null,
        tanggalMasuk: body.tanggalMasuk ? new Date(body.tanggalMasuk) : new Date(),
        status: body.status || "aktif",
        catatan: body.catatan || null,
      },
    });
    return NextResponse.json({ data: serialize(ustaz) }, { status: 201 });
  } catch (err) {
    console.error("[ustaz POST] error:", err);
    return NextResponse.json({ error: "Gagal menambah ustaz" }, { status: 500 });
  }
}
