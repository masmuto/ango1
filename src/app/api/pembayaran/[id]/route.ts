import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pembayaran = await db.pembayaranSPP.findUnique({
      where: { id },
      include: {
        santri: {
          select: {
            id: true,
            nis: true,
            nama: true,
            noHpOrtu: true,
            namaAyah: true,
            kelas: { select: { nama: true } },
          },
        },
      },
    });
    if (!pembayaran) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: serialize(pembayaran) });
  } catch (err) {
    console.error("[pembayaran GET id] error:", err);
    return NextResponse.json({ error: "Gagal memuat pembayaran" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.pembayaranSPP.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pembayaran DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus pembayaran" }, { status: 500 });
  }
}
