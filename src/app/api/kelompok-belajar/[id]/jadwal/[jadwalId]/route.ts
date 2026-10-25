import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/kelompok-belajar/[id]/jadwal/[jadwalId] — delete jadwal
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; jadwalId: string }> }) {
  try {
    const { jadwalId } = await params;
    await db.jadwalKelompok.delete({ where: { id: jadwalId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[jadwal DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus jadwal" }, { status: 500 });
  }
}
