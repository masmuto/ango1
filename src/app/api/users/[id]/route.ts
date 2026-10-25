import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      role: body.role,
      active: body.active !== false,
    };
    if (body.password) data.password = body.password;
    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json({ data: serialize(user) });
  } catch (err) {
    console.error("[users PUT] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui user" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[users DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus user" }, { status: 500 });
  }
}
