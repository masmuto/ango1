import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ustaz = await db.ustaz.update({
      where: { id },
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
        status: body.status || "aktif",
        catatan: body.catatan || null,
      },
    });
    return NextResponse.json({ data: serialize(ustaz) });
  } catch (err) {
    console.error("[ustaz PUT] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui ustaz" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.ustaz.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ustaz DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus ustaz" }, { status: 500 });
  }
}
