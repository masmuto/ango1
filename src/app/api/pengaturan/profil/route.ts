import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get("an-nahl-session")?.value;
    if (!sid) return NextResponse.json({ error: "Belum login" }, { status: 401 });
    const user = await db.user.findUnique({ where: { id: sid } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    return NextResponse.json({
      data: serialize({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        active: user.active,
        lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      }),
    });
  } catch (err) {
    console.error("[profil GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get("an-nahl-session")?.value;
    if (!sid) return NextResponse.json({ error: "Belum login" }, { status: 401 });
    const body = await req.json();
    const data: Record<string, unknown> = {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      avatar: body.avatar || null,
    };
    if (body.password) data.password = body.password;
    const user = await db.user.update({ where: { id: sid }, data });
    return NextResponse.json({
      data: serialize({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        active: user.active,
        lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      }),
    });
  } catch (err) {
    console.error("[profil PUT] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 });
  }
}
