// Helper format yang aman dipakai di client dan server
export const TZ = "Asia/Jakarta";

export function rupiah(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

export function rp(n: number): string {
  return "Rp " + rupiah(n);
}

export function fmtDateTime(d: string | Date): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(x);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour")}:${g("minute")}`;
}

export function fmtTime(d: string | Date): string {
  return fmtDateTime(d).slice(11);
}

/** "2026-11-11" -> "Rab, 11 Nov 2026" */
export function fmtBusinessDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Hari bisnis: jam WIB dikurangi jam pergantian hari.
 * Contoh cutoff 06:00 -> transaksi 11/11 pukul 01:00 masuk ke hari bisnis 10/11.
 */
export function businessDateOf(at: Date, cutoff = "06:00"): string {
  const [h, m] = cutoff.split(":").map(Number);
  const wibMs = at.getTime() + 7 * 3600_000; // WIB = UTC+7, tanpa DST
  const shifted = new Date(wibMs - ((h || 0) * 60 + (m || 0)) * 60_000);
  return shifted.toISOString().slice(0, 10);
}
