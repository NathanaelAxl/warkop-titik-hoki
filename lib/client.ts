"use client";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** fetch JSON ke API sendiri. Error koneksi diberi pesan yang jelas. */
export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Koneksi internet terputus. Data BELUM tersimpan — coba lagi.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
      window.location.href = "/login";
    }
    throw new ApiError(res.status, (data as { error?: string }).error ?? `Gagal (${res.status})`);
  }
  return data as T;
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Terjadi kesalahan";
}
