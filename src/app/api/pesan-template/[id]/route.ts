import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const template = await db.pesanTemplate.update({
      where: { id },
      data: {
        nama: body.nama,
        isi: body.isi,
        kategori: body.kategori || "umum",
        aktif: body.aktif !== false,
      },
    });
    return NextResponse.json({ data: serialize(template) });
  } catch (err) {
    console.error("[pesan-template PUT] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui template" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.pesanTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pesan-template DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus template" }, { status: 500 });
  }
}
