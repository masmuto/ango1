/**
 * Permanent Firebase configuration for GO An Nahl.
 *
 * These values are HARDCODED as the source-of-truth fallback so the app
 * keeps working even if `.env` is reset, the server is restarted, or the
 * project is cloned to a new environment without env vars configured.
 *
 * If you ever change the Firebase project, update BOTH:
 *   1. This file (src/lib/firebase-config.ts)
 *   2. The `.env` file in the project root
 *
 * Project: dompetku-300ae
 * Web app registered: 1:1008213102945:web:706e9304b20fb7f8cc7520
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// ============================================================
// HARDCODED VALUES — do not delete or modify unless changing project
// ============================================================
export const FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyDLiHiKASzzStEhToaEKQ3rs4D7OZ7cx2Y",
  authDomain: "dompetku-300ae.firebaseapp.com",
  databaseURL: "https://dompetku-300ae-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dompetku-300ae",
  storageBucket: "dompetku-300ae.firebasestorage.app",
  messagingSenderId: "1008213102945",
  appId: "1:1008213102945:web:706e9304b20fb7f8cc7520",
  measurementId: "G-X9WZPY3B3J",
};

/**
 * Returns the active Firebase config, preferring env vars (in case they
 * were overridden for testing) but falling back to the hardcoded values.
 *
 * This guarantees the app always has a config — it can never return null.
 */
export function getFirebaseConfig(): FirebaseConfig {
  // Env vars take precedence (allows overriding for staging/prod)
  const envApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const envProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId && !envApiKey.includes("REPLACE_WITH")) {
    return {
      apiKey: envApiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: envProjectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
  }

  // Fall back to hardcoded values — this is the "permanent" source
  return FIREBASE_CONFIG;
}

// Convenience accessors used throughout the app
export const FIREBASE_API_KEY = getFirebaseConfig().apiKey;
export const FIREBASE_PROJECT_ID = getFirebaseConfig().projectId;
export const FIREBASE_AUTH_DOMAIN = getFirebaseConfig().authDomain;
export const FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1";
