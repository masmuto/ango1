export interface SafeFetchResult<T> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

export async function safeFetchJson<T>(
  url: string,
  options?: RequestInit,
  timeoutMs?: number,
): Promise<SafeFetchResult<T>> {
  try {
    const controller = timeoutMs ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    const mergedOptions: RequestInit = controller
      ? { ...options, signal: options?.signal ?? controller.signal }
      : options ?? {};
    try {
      const res = await fetch(url, mergedOptions);
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text };
      }
      if (!res.ok) {
        const errMsg =
          (json && typeof json === "object" && "error" in json && typeof (json as Record<string, unknown>).error === "string")
            ? (json as Record<string, unknown>).error as string
            : `HTTP ${res.status}`;
        return { data: null, error: errMsg, status: res.status, ok: false };
      }
      const data = (json && typeof json === "object" && "data" in json)
        ? (json as Record<string, unknown>).data as T
        : (json as T);
      return { data, error: null, status: res.status, ok: true };
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err) {
    const msg = String(err);
    if (/abort/i.test(msg)) {
      return { data: null, error: "Timeout — server tidak merespons dalam batas waktu", status: 0, ok: false };
    }
    return { data: null, error: msg, status: 0, ok: false };
  }
}
