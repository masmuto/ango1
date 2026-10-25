/**
 * Firebase Admin SDK — server-side initialization (Vercel-compatible).
 *
 * Vercel serverless functions CANNOT read files from the filesystem at runtime.
 * So we don't try to load a service-account.json file — instead we init from:
 *   1. Inline env vars: FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (preferred for Vercel)
 *   2. Project ID only (for Auth REST API; Firestore won't work without credential)
 *
 * Auth REST API works fine with just the project ID + API key (which are
 * hardcoded in src/lib/firebase-config.ts), so login works out of the box.
 *
 * For full Firestore access on Vercel, set these env vars in your Vercel project:
 *   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
 *   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"
 *
 * (You can get these from Firebase Console → Project Settings → Service Accounts →
 *  Generate new private key. Copy the values into Vercel env vars.)
 */
import admin from "firebase-admin";
import { getFirebaseConfig } from "@/lib/firebase-config";

let app: admin.app.App | null = null;
let initError: string | null = null;
let isConfigured = false;

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return /REPLACE_WITH|your-project|XXXXX|0000000/.test(value);
}

function tryInit(): void {
  if (app || initError) return;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Read project ID from permanent config (with env override)
  const firebaseConfig = getFirebaseConfig();
  const projectId = firebaseConfig.projectId;

  // Path 1: Inline env vars (preferred for Vercel — no filesystem reads)
  if (clientEmail && privateKey && !isPlaceholder(clientEmail) && !isPlaceholder(privateKey)) {
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Vercel env vars store newlines as literal \n — convert back
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
      isConfigured = true;
      return;
    } catch (err) {
      initError = `Gagal inisialisasi Admin SDK: ${String(err)}`;
      return;
    }
  }

  // Path 2: Project ID only — uses the permanent hardcoded config.
  // Auth REST API (signInWithPassword, createUser, etc.) works via fetch,
  // but Firestore server-side calls require a credential and will not work.
  if (projectId && !isPlaceholder(projectId)) {
    try {
      app = admin.initializeApp({
        projectId,
        // No credential — Firestore won't work, but Auth REST will
      });
      isConfigured = true;
      initError = null;
      return;
    } catch (err) {
      initError = `Gagal inisialisasi dengan projectId: ${String(err)}`;
      return;
    }
  }

  // Should never reach here since firebase-config.ts always returns a value
  initError = "Firebase config tidak ditemukan. Periksa src/lib/firebase-config.ts";
}

try {
  tryInit();
} catch (err) {
  initError = String(err);
}

export function getFirebaseApp(): admin.app.App | null {
  if (!app) tryInit();
  return app;
}

export function getFirestore(): admin.firestore.Firestore {
  const a = getFirebaseApp();
  if (!a) {
    throw new Error(initError || "Firebase belum dikonfigurasi");
  }
  return a.firestore();
}

export function getFirebaseAuth(): admin.auth.Auth {
  const a = getFirebaseApp();
  if (!a) {
    throw new Error(initError || "Firebase belum dikonfigurasi");
  }
  return a.auth();
}

export function isFirebaseConfigured(): boolean {
  return isConfigured;
}

export function getFirebaseInitError(): string | null {
  return initError;
}

export { admin };
