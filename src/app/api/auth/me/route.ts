import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get("an-nahl-session")?.value;
    if (!sid) return NextResponse.json({ user: null });

    const user = await db.user.findUnique({ where: { id: sid } });
    if (!user || !user.active) return NextResponse.json({ user: null });

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as SessionUser["role"],
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      active: user.active,
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    };
    return NextResponse.json({ user: sessionUser });
  } catch {
    return NextResponse.json({ user: null });
  }
}
