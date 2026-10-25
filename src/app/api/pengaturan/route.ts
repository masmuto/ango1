import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// General settings: key-value pairs stored in Pengaturan table
export async function GET() {
  try {
    const rows = await db.pengaturan.findMany();
    const data: Record<string, string> = {};
    for (const r of rows) data[r.key] = r.value;
    return NextResponse.json({ data: serialize(data) });
  } catch (err) {
    console.error("[pengaturan GET] error:", err);
    return NextResponse.json({ data: {} });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, string>;
    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        db.pengaturan.upsert({
          where: { key },
          update: { value: String(value) },
          create: { id: key, key, value: String(value) },
        }),
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pengaturan PUT] error:", err);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
