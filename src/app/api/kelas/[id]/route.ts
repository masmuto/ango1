import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const kelas = await db.kelas.update({
      where: { id },
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
    return NextResponse.json({ data: serialize(kelas) });
  } catch (err) {
    console.error("[kelas PUT] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui kelas" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.kelas.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[kelas DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus kelas" }, { status: 500 });
  }
}
