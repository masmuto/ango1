import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/fcm/subscribe — save or update a push subscription
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, userId } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Format subscription tidak valid" },
        { status: 400 },
      );
    }

    // Try to attach userId from cookie if not provided
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const cookieStore = await cookies();
      const sid = cookieStore.get("an-nahl-session")?.value;
      if (sid) resolvedUserId = sid;
    }

    const userAgent = req.headers.get("user-agent") || null;

    // Upsert — if endpoint already exists, update keys + reactivate
    const sub = await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: resolvedUserId || null,
        userAgent,
        active: true,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: resolvedUserId || null,
        userAgent,
        active: true,
      },
    });

    return NextResponse.json({ ok: true, id: sub.id });
  } catch (err) {
    console.error("[fcm/subscribe] error:", err);
    return NextResponse.json({ error: "Gagal menyimpan subscription" }, { status: 500 });
  }
}

// DELETE /api/fcm/subscribe — remove a subscription
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");
    if (!endpoint) return NextResponse.json({ error: "endpoint wajib" }, { status: 400 });

    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fcm/unsubscribe] error:", err);
    return NextResponse.json({ error: "Gagal menghapus subscription" }, { status: 500 });
  }
}
