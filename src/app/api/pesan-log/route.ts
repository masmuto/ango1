import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 100;
    const logs = await db.pesanLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json({ data: serialize(logs) });
  } catch (err) {
    console.error("[pesan-log GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat log" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const log = await db.pesanLog.create({
      data: {
        penerima: body.penerima,
        namaPenerima: body.namaPenerima || null,
        pesan: body.pesan,
        kategori: body.kategori || "umum",
        status: body.status || "terkirim",
        mode: body.mode || "manual",
        refId: body.refId || null,
        refType: body.refType || null,
        error: body.error || null,
        durationMs: Number(body.durationMs) || 0,
      },
    });
    return NextResponse.json({ data: serialize(log) }, { status: 201 });
  } catch (err) {
    console.error("[pesan-log POST] error:", err);
    return NextResponse.json({ error: "Gagal mencatat log" }, { status: 500 });
  }
}
