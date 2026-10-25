import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const templates = await db.pesanTemplate.findMany({
      orderBy: { nama: "asc" },
    });
    return NextResponse.json({ data: serialize(templates) });
  } catch (err) {
    console.error("[pesan-template GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat template" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kode = body.kode || `TPL-${Date.now().toString(36).toUpperCase()}`;
    const template = await db.pesanTemplate.create({
      data: {
        kode,
        nama: body.nama,
        isi: body.isi,
        kategori: body.kategori || "umum",
        aktif: body.aktif !== false,
      },
    });
    return NextResponse.json({ data: serialize(template) }, { status: 201 });
  } catch (err) {
    console.error("[pesan-template POST] error:", err);
    return NextResponse.json({ error: "Gagal menambah template" }, { status: 500 });
  }
}
