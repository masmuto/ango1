"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Bell, BellOff, Loader2 } from "lucide-react";
import {
  initPWA,
  canInstall,
  onInstallAvailabilityChange,
  promptInstall,
  isStandalone,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pwa-client";
import { toast } from "sonner";
import { useSession } from "@/lib/session-store";

export function PwaInstallBanner() {
  // Lazy init: read dismissed state from localStorage once on mount
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("pwa-install-dismissed") === "1";
  });
  const [showInstall, setShowInstall] = useState<boolean>(() => canInstall());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    initPWA();
    // Subscribe to install availability changes (the listener fires immediately
    // if beforeinstallprompt was already captured)
    const unsub = onInstallAvailabilityChange((available) => {
      setShowInstall(available);
    });
    return unsub;
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    const ok = await promptInstall();
    setInstalling(false);
    if (ok) {
      toast.success("Aplikasi ditambahkan ke layar utama");
      setShowInstall(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("pwa-install-dismissed", "1");
    }
  };

  // Don't show if already standalone or dismissed or no install available
  if (isStandalone() || dismissed || !showInstall) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-card border border-border shadow-lg rounded-xl p-4 flex items-center gap-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.28_0.06_150)] flex items-center justify-center">
          <Download size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Pasang GO An Nahl</p>
          <p className="text-xs text-muted-foreground truncate">Akses cepat dari layar utama, bekerja offline</p>
        </div>
        <Button size="sm" onClick={handleInstall} disabled={installing} className="flex-shrink-0">
          {installing ? <Loader2 size={14} className="animate-spin" /> : "Pasang"}
        </Button>
        <Button size="icon" variant="ghost" className="flex-shrink-0 h-8 w-8" onClick={handleDismiss} aria-label="Tutup">
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}

export function PushNotificationToggle() {
  const { user } = useSession();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    // Check if already subscribed
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => setSubscribed(false));
    } else {
      setSubscribed(false);
    }
  }, []);

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        const r = await unsubscribeFromPush();
        if (r.ok) {
          setSubscribed(false);
          toast.success(r.message);
        } else {
          toast.error(r.message);
        }
      } else {
        const perm = await requestNotificationPermission();
        setPermission(perm);
        if (perm !== "granted") {
          toast.error("Izin notifikasi ditolak. Aktifkan di pengaturan browser.");
          return;
        }
        const r = await subscribeToPush(user?.id);
        if (r.ok) {
          setSubscribed(true);
          toast.success(r.message);
          // Send a test notification
          try {
            const sendRes = await fetch("/api/fcm/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Notifikasi Aktif",
                body: "Anda akan menerima pengingat SPP dan pembaruan penting.",
                tag: "welcome",
              }),
            });
            if (sendRes.ok) {
              toast.info("Notifikasi tes telah dikirim");
            }
          } catch {
            // ignore
          }
        } else {
          toast.error(r.message);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (permission === "unsupported") {
    return (
      <div className="text-xs text-muted-foreground italic">
        Browser tidak mendukung notifikasi push
      </div>
    );
  }

  const ButtonIcon = subscribed ? Bell : BellOff;
  const buttonLabel = subscribed ? "Notifikasi Aktif" : "Aktifkan Notifikasi";

  return (
    <Button
      variant={subscribed ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={busy}
      className="w-full"
    >
      {busy ? (
        <Loader2 size={14} className="mr-1 animate-spin" />
      ) : (
        <ButtonIcon size={14} className="mr-1" />
      )}
      {buttonLabel}
    </Button>
  );
}
