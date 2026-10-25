import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// GET /api/kelompok-belajar/[id]/jadwal — list jadwal kelompok
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const jadwal = await db.jadwalKelompok.findMany({ where: { kelompokId: id } });
    return NextResponse.json({ data: serialize(jadwal) });
  } catch (err) {
    console.error("[jadwal GET] error:", err);
    return NextResponse.json({ data: [] });
  }
}

// POST /api/kelompok-belajar/[id]/jadwal — add jadwal
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const jadwal = await db.jadwalKelompok.create({
      data: {
        kelompokId: id,
        hari: body.hari,
        jamMulai: body.jamMulai,
        jamSelesai: body.jamSelesai,
      },
    });
    return NextResponse.json({ data: serialize(jadwal) }, { status: 201 });
  } catch (err) {
    console.error("[jadwal POST] error:", err);
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 });
  }
}
