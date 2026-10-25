"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnNahlLogo, AnNahlTagline } from "@/components/an-nahl-logo";
import { safeFetchJson } from "@/lib/safe-fetch";
import { toast } from "sonner";
import {
  Cloud,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Server,
  Flame,
  ListChecks,
  ArrowRight,
} from "lucide-react";

interface FirebaseStatus {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    configured: boolean;
    initError: string | null;
  };
  database: {
    hasUsers: boolean;
    userCount: number;
    error: string | null;
  };
  needsSetup: boolean;
}

interface TestResult {
  ok: boolean;
  results?: {
    configured: boolean;
    reachable: boolean;
    authWorks: boolean;
    firestoreWorks: boolean;
    existingCollections: string[];
    collectionCount: number;
    errors: string[];
  };
  message?: string;
  error?: string;
}

const SETUP_STEPS = [
  {
    title: "Buat Project Firebase",
    description: "Kunjungi Firebase Console, buat project baru (atau pilih existing). Aktifkan Firestore Database (Production mode).",
    link: "https://console.firebase.google.com/",
    linkLabel: "Firebase Console",
  },
  {
    title: "Daftarkan Web App",
    description: "Project Settings → General → Your apps → Add app → Web. Salin config (apiKey, authDomain, projectId, dst.) ke file .env",
    link: "https://console.firebase.google.com/project/_/settings/general/",
    linkLabel: "Project Settings",
  },
  {
    title: "Aktifkan Email/Password Auth",
    description: "Authentication → Sign-in method → Email/Password → Enable. Ini wajib agar admin/bendahara/pengelola bisa login.",
    link: "https://console.firebase.google.com/project/_/authentication/providers",
    linkLabel: "Auth Providers",
  },
  {
    title: "(Opsional) Service Account untuk Firestore",
    description: "Hanya perlu jika ingin server baca/tulis Firestore. Login Firebase Auth sudah jalan tanpa ini. Vercel: set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY di Project Settings → Environment Variables.",
    link: "https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk",
    linkLabel: "Service Accounts",
  },
  {
    title: "Set Firestore Security Rules",
    description: "Firestore → Rules → paste rules yang tersedia di tombol di bawah → Publish. Rules memberi akses baca/tulis ke user yang sudah login.",
    link: "https://console.firebase.google.com/project/_/firestore/rules",
    linkLabel: "Firestore Rules",
  },
];

export function FirebaseSetupView({ onBack }: { onBack?: () => void }) {
  const [status, setStatus] = useState<FirebaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rulesContent, setRulesContent] = useState<string>("");

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await safeFetchJson<FirebaseStatus>("/api/firebase/status");
      if (!result.data) {
        toast.error("Gagal memuat status: " + result.error);
        return;
      }
      setStatus(result.data);
    } catch (err) {
      toast.error("Gagal memuat status: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      const res = await fetch("/api/firebase/init");
      const d = await res.json();
      if (d?.data?.rules) {
        setRulesContent(d.data.rules);
      }
    } catch (err) {
      toast.error("Gagal memuat rules: " + String(err));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await safeFetchJson<TestResult>("/api/firebase/test", { method: "POST" }, 15000);
      if (!result.data) {
        toast.error(result.error || "Gagal test koneksi");
        setTestResult({ ok: false, error: result.error });
      } else {
        setTestResult(result.data);
        if (result.data.ok) {
          toast.success(result.data.message || "Terkoneksi ke Firebase");
        } else {
          toast.error(result.data.message || "Koneksi gagal");
        }
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleInit = async () => {
    setInitializing(true);
    try {
      const result = await safeFetchJson<{ ok: boolean; results: Array<{ step: string; ok: boolean; message: string }>; error?: string }>(
        "/api/firebase/init",
        { method: "POST" },
        30000,
      );
      if (!result.ok || !result.data?.ok) {
        toast.error(result.data?.error || result.error || "Inisialisasi gagal");
        return;
      }
      const successCount = result.data.results?.filter((r) => r.ok).length || 0;
      toast.success(`Inisialisasi selesai. ${successCount} langkah berhasil.`);
      refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setInitializing(false);
    }
  };

  const handleMigrate = async () => {
    if (!confirm("Migrasi akan menyalin semua data dari SQLite lokal ke Firestore (85 santri, 8 ustaz, 6 kelas, 56 pembayaran). Lanjutkan?")) {
      return;
    }
    setMigrating(true);
    try {
      const result = await safeFetchJson<{ ok: boolean; counts: Record<string, number>; message: string; error?: string }>(
        "/api/firebase/migrate",
        { method: "POST" },
        120000,
      );
      if (!result.ok || !result.data?.ok) {
        toast.error(result.data?.error || result.error || "Migrasi gagal");
        return;
      }
      toast.success(result.data.message || "Migrasi selesai");
      refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="text-primary" />
            Koneksi Firebase
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi Firebase Firestore & Authentication
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowRight size={14} className="mr-1 rotate-180" /> Kembali
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin mr-1" : "mr-1"} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server size={18} className="text-primary" />
            Status Koneksi
          </CardTitle>
          <CardDescription>Konfigurasi saat ini dibaca dari environment variables (.env) dan service-account.json</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && !status ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Memuat...
            </div>
          ) : status ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {status.firebase.configured ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <CheckCircle2 size={12} className="mr-1" /> Terkonfigurasi
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle size={12} className="mr-1" /> Belum dikonfigurasi
                  </Badge>
                )}
                <Badge variant="outline">Project: {status.firebase.projectId || "-"}</Badge>
                {status.database.hasUsers && (
                  <Badge variant="secondary">
                    <Database size={12} className="mr-1" /> {status.database.userCount} user
                  </Badge>
                )}
              </div>

              {status.firebase.initError && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Belum siap digunakan</AlertTitle>
                  <AlertDescription>{status.firebase.initError}</AlertDescription>
                </Alert>
              )}

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <ConfigRow label="API Key" value={status.firebase.apiKey} masked />
                <ConfigRow label="Auth Domain" value={status.firebase.authDomain} />
                <ConfigRow label="Project ID" value={status.firebase.projectId} />
                <ConfigRow label="Storage Bucket" value={status.firebase.storageBucket} />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleTest} disabled={testing || !status.firebase.configured}>
                  {testing ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" /> Testing...
                    </>
                  ) : (
                    <>
                      <Server size={14} className="mr-1" /> Test Koneksi
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleInit} disabled={initializing || !status.firebase.configured}>
                  {initializing ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" /> Menginisialisasi...
                    </>
                  ) : (
                    <>
                      <Flame size={14} className="mr-1" /> Inisialisasi Akun Auth
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleMigrate} disabled={migrating || !status.firebase.configured}>
                  {migrating ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" /> Migrasi...
                    </>
                  ) : (
                    <>
                      <Database size={14} className="mr-1" /> Migrasi Data (SQLite → Firestore)
                    </>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => { setShowRules(!showRules); if (!rulesContent) loadRules(); }}>
                  <ListChecks size={14} className="mr-1" /> {showRules ? "Sembunyikan" : "Lihat"} Security Rules
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Test result */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {testResult.ok ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : (
                <XCircle size={18} className="text-destructive" />
              )}
              Hasil Test Koneksi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testResult.message && (
              <p className="text-sm font-medium">{testResult.message}</p>
            )}
            {testResult.results && (
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <StatusRow label="Config terbaca" ok={testResult.results.configured} />
                <StatusRow label="Firestore reachable" ok={testResult.results.reachable} />
                <StatusRow label="Firestore read/write" ok={testResult.results.firestoreWorks} />
                <StatusRow label="Auth API key valid" ok={testResult.results.authWorks} />
              </div>
            )}
            {testResult.results?.existingCollections && testResult.results.existingCollections.length > 0 && (
              <div className="text-sm">
                <p className="font-medium mb-1">Collections aktif ({testResult.results.collectionCount}/11):</p>
                <div className="flex flex-wrap gap-1">
                  {testResult.results.existingCollections.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {testResult.results?.errors && testResult.results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {testResult.results.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security rules */}
      {showRules && rulesContent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firestore Security Rules</CardTitle>
            <CardDescription>
              Paste di Firebase Console → Firestore Database → Rules → Publish
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">{rulesContent}</pre>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                navigator.clipboard.writeText(rulesContent);
                toast.success("Rules disalin ke clipboard");
              }}
            >
              Copy Rules
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Setup steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud size={18} className="text-primary" />
            Panduan Setup Firebase
          </CardTitle>
          <CardDescription>Ikuti langkah berikut untuk menghubungkan aplikasi ke Firebase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SETUP_STEPS.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                <a
                  href={step.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {step.linkLabel}
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="bg-muted/30 border-t flex flex-col items-start gap-3">
          <div className="text-xs space-y-1 w-full">
            <p className="font-medium">Env vars untuk Vercel (Project Settings → Environment Variables):</p>
            <pre className="bg-muted p-2 rounded text-[11px] overflow-auto">{`DATABASE_URL=postgresql://...  (Vercel Postgres / Neon / Supabase)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Opsional (untuk Firestore server-side):
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n`}</pre>
            <p className="text-muted-foreground">
              Firebase config sudah hardcoded di <code>src/lib/firebase-config.ts</code> — env vars hanya override jika perlu.
              Setelah set env vars di Vercel, klik Redeploy. Lalu jalankan <code>curl -X POST https://your-app.vercel.app/api/seed</code> untuk inisialisasi data.
            </p>
          </div>
        </CardFooter>
      </Card>

      <div className="flex justify-center pt-4">
        <AnNahlTaglineImpl />
      </div>
    </div>
  );
}

function ConfigRow({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const display = masked && value ? `${value.slice(0, 8)}...${value.slice(-4)}` : value || "-";
  return (
    <div className="flex justify-between items-center gap-2 pb-2 border-b border-border/50">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-mono text-xs truncate max-w-[60%]" title={value}>{display}</span>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 size={14} className="text-emerald-600" />
      ) : (
        <XCircle size={14} className="text-destructive" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

// Use the imported AnNahlTagline from @/components/an-nahl-logo
function AnNahlTaglineImpl() {
  return <AnNahlTagline />;
}
