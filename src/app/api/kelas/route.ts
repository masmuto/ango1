import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const kelas = await db.kelas.findMany({
      include: {
        ustaz: { select: { id: true, nama: true } },
        _count: { select: { santri: true } },
      },
      orderBy: { nama: "asc" },
    });
    return NextResponse.json({ data: serialize(kelas) });
  } catch (err) {
    console.error("[kelas GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat kelas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kelas = await db.kelas.create({
      data: {
        nama: body.nama,
        tingkat: body.tingkat || "Tahsin",
        ustazId: body.ustazId || null,
        kapasitas: Number(body.kapasitas) || 20,
        keterangan: body.keterangan || null,
      },
      include: {
        ustaz: { select: { id: true, nama: true } },
        _count: { select: { santri: true } },
      },
    });
    return NextResponse.json({ data: serialize(kelas) }, { status: 201 });
  } catch (err) {
    console.error("[kelas POST] error:", err);
    return NextResponse.json({ error: "Gagal menambah kelas" }, { status: 500 });
  }
}
