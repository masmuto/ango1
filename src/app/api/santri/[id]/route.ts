import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const santri = await db.santri.update({
      where: { id },
      data: {
        nama: body.nama,
        jenisKelamin: body.jenisKelamin || "L",
        tempatLahir: body.tempatLahir || null,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        alamat: body.alamat || null,
        namaAyah: body.namaAyah || null,
        namaIbu: body.namaIbu || null,
        noHpOrtu: body.noHpOrtu || null,
        kelasId: body.kelasId || null,
        status: body.status || "aktif",
        catatan: body.catatan || null,
        sppBulanan: Number(body.sppBulanan) || 150000,
      },
      include: { kelas: { select: { id: true, nama: true, tingkat: true } } },
    });
    return NextResponse.json({ data: serialize(santri) });
  } catch (err) {
    console.error("[santri PUT] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui santri" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.santri.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[santri DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus santri" }, { status: 500 });
  }
}
