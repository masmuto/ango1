import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import webpush from "web-push";

export const dynamic = "force-dynamic";

interface SendBody {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  targetUserId?: string; // optional: only send to a specific user
}

export async function POST(req: NextRequest) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: "VAPID keys belum diset di .env (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)" },
        { status: 503 },
      );
    }

    webpush.setVapidDetails(
      "mailto:admin@annahl.sch.id",
      publicKey,
      privateKey,
    );

    const body = (await req.json()) as SendBody;
    const title = body.title || "GO An Nahl";
    const messageBody = body.body || "Anda memiliki pembaruan baru";
    const url = body.url || "/";
    const tag = body.tag || "an-nahl-general";

    const payload = JSON.stringify({
      title,
      body: messageBody,
      url,
      tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      timestamp: Date.now(),
    });

    // Get subscriptions
    const where = body.targetUserId
      ? { userId: body.targetUserId, active: true }
      : { active: true };
    const subscriptions = await db.pushSubscription.findMany({ where });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "Belum ada subscription aktif. Buka app di browser yang mendukung notifikasi dan aktifkan izin.",
      });
    }

    // Send to each subscription
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        ),
      ),
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedSubs: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const err = r.reason as { statusCode?: number };
        // 410 = subscription expired, 404 = invalid — deactivate
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          failedSubs.push(subscriptions[i].endpoint);
        }
      }
    });

    // Deactivate invalid subscriptions
    if (failedSubs.length > 0) {
      await db.pushSubscription.updateMany({
        where: { endpoint: { in: failedSubs } },
        data: { active: false },
      });
    }

    return NextResponse.json({
      ok: true,
      sent: successCount,
      total: subscriptions.length,
      deactivated: failedSubs.length,
    });
  } catch (err) {
    console.error("[fcm/send] error:", err);
    return NextResponse.json({ error: `Gagal mengirim notifikasi: ${String(err)}` }, { status: 500 });
  }
}
