"use client";

/**
 * PWA client-side helper.
 *
 * Handles:
 *   1. Service Worker registration (Next.js PWA via @ducanh2912/next-pwa)
 *   2. Notification permission request
 *   3. Web Push subscription (sends to /api/fcm/subscribe)
 *   4. Install prompt capture (beforeinstallprompt event) for "Add to Home Screen"
 *   5. Listen for incoming push messages (via SW postMessage)
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function initPWA(): void {
  if (typeof window === "undefined") return;

  // Register our static service worker at /sw.js
  if ("serviceWorker" in navigator) {
    // Register immediately if document is already loaded; else wait for load event
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);
          // Check for updates every hour
          setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }

  // Capture the beforeinstallprompt event so we can trigger it later from a button
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((cb) => cb(true));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installListeners.forEach((cb) => cb(false));
    console.log("[PWA] App installed successfully");
  });
}

export function canInstall(): boolean {
  return deferredInstallPrompt !== null;
}

export function onInstallAvailabilityChange(cb: (canInstall: boolean) => void): () => void {
  installListeners.add(cb);
  // Fire immediately with current state so newly-subscribed components sync
  Promise.resolve().then(() => cb(deferredInstallPrompt !== null));
  return () => installListeners.delete(cb);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;
  await deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  if (choice.outcome === "accepted") {
    deferredInstallPrompt = null;
    installListeners.forEach((cb) => cb(false));
    return true;
  }
  return false;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // Android Chrome
  if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  return false;
}

// === Push Notifications ===

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
}

export async function subscribeToPush(userId?: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, message: "Browser tidak mendukung push notification" };
    }

    // Wait for SW registration to be ready
    const reg = await navigator.serviceWorker.ready;

    // Fetch VAPID public key
    const vapidRes = await fetch("/api/fcm/vapid");
    if (!vapidRes.ok) {
      return { ok: false, message: "Gagal mengambil VAPID key (cek .env)" };
    }
    const { publicKey } = await vapidRes.json();
    if (!publicKey) {
      return { ok: false, message: "VAPID public key belum dikonfigurasi" };
    }

    // Convert base64 to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Send to server
    const sub = subscription.toJSON();
    const saveRes = await fetch("/api/fcm/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: sub.keys,
        userId,
      }),
    });

    if (!saveRes.ok) {
      return { ok: false, message: "Gagal menyimpan subscription di server" };
    }

    return { ok: true, message: "Berhasil berlangganan notifikasi" };
  } catch (err) {
    return { ok: false, message: `Error: ${String(err)}` };
  }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; message: string }> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return { ok: true, message: "Tidak ada subscription aktif" };

    const endpoint = sub.endpoint;
    await sub.unsubscribe();

    await fetch(`/api/fcm/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
      method: "DELETE",
    });

    return { ok: true, message: "Berhasil berhenti berlangganan" };
  } catch (err) {
    return { ok: false, message: `Error: ${String(err)}` };
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
