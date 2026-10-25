import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// DELETE /api/kelompok-belajar/[id]/anggota/[anggotaId] — remove santri from kelompok
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; anggotaId: string }> }) {
  try {
    const { anggotaId } = await params;
    await db.anggotaKelompok.delete({ where: { id: anggotaId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[anggota DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus anggota" }, { status: 500 });
  }
}
