import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: serialize(users) });
  } catch (err) {
    console.error("[users GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const existing = await db.user.findUnique({ where: { username: body.username } });
    if (existing) return NextResponse.json({ error: "Username sudah dipakai" }, { status: 400 });

    const user = await db.user.create({
      data: {
        username: body.username,
        password: body.password || "password",
        name: body.name || body.username,
        role: body.role || "pengelola",
        email: body.email || null,
        phone: body.phone || null,
        active: body.active !== false,
      },
    });
    return NextResponse.json({ data: serialize(user) }, { status: 201 });
  } catch (err) {
    console.error("[users POST] error:", err);
    return NextResponse.json({ error: "Gagal menambah user" }, { status: 500 });
  }
}
