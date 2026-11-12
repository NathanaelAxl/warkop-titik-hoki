"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Printer,
  ReceiptText,
  Settings,
  UtensilsCrossed,
  Users,
  WifiOff,
} from "lucide-react";
import { useApp } from "./app-context";
import { api } from "@/lib/client";
import { getPrinterState, subscribePrinter, type PrinterState } from "@/lib/printer";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Kasir", icon: ClipboardList, owner: false },
  { href: "/transactions", label: "Riwayat", icon: ReceiptText, owner: false },
  { href: "/reports", label: "Laporan", icon: BarChart3, owner: true },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, owner: true },
  { href: "/admin/users", label: "Pegawai", icon: Users, owner: true },
  { href: "/admin/settings", label: "Toko", icon: Settings, owner: true },
  { href: "/printer", label: "Printer", icon: Printer, owner: false },
];

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const path = usePathname();
  const online = useOnline();
  const [printer, setPrinter] = useState<PrinterState>({ status: "disconnected", name: null });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setPrinter(getPrinterState());
    return subscribePrinter(setPrinter);
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { body: {} });
    } finally {
      window.location.href = "/login";
    }
  }

  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/order") : path.startsWith(href));
  const nav = NAV.filter((n) => !n.owner || user.role === "owner");
  // Layar pesanan punya bar bawah sendiri (keranjang), jadi nav bawah disembunyikan di HP
  const onOrderScreen = path.startsWith("/order");
  const printerDot = (
    <span
      className={cn(
        "h-2.5 w-2.5 rounded-full",
        printer.status === "connected" ? "bg-emerald-400" : printer.status === "connecting" ? "bg-amber-400" : "bg-stone-500",
      )}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="bg-espresso-gradient flex h-14 shrink-0 items-center gap-2 px-3 text-white shadow-lg shadow-espresso-900/20 md:h-16">
        <Link href="/" className="mr-auto flex items-center gap-2 md:mr-2">
          <img src="/icon.svg" alt="" className="h-8 w-8 md:h-9 md:w-9" />
          <span className="leading-tight md:hidden xl:block"><span className="block text-[15px] font-extrabold tracking-tight">Titik Hoki</span><span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-brand-300">Kasir Warkop</span></span>
        </Link>
        <nav className="scroll-thin hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition",
                isActive(n.href) ? "bg-brand-gradient text-white shadow-md shadow-brand-900/40" : "text-cream-200/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <n.icon className="h-5 w-5" />
              <span className="hidden lg:inline">{n.label}</span>
              {n.href === "/printer" && printerDot}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right text-sm leading-tight">
            <div className="max-w-28 truncate font-semibold">{user.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-brand-300">{user.role}</div>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/20 md:h-11"
            title="Ganti pengguna / Logout"
            aria-label="Ganti pengguna"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden md:inline">Ganti Pengguna</span>
          </button>
        </div>
      </header>
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
          <WifiOff className="h-4 w-4 shrink-0" />
          Internet terputus! Pesanan yang belum disimpan tetap di layar — simpan lagi setelah koneksi kembali.
        </div>
      )}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>

      {/* Navigasi bawah untuk HP */}
      {!onOrderScreen && (
        <nav
          className="grid shrink-0 border-t border-white/5 bg-espresso-950 pb-[env(safe-area-inset-bottom)] md:hidden"
          style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
        >
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                isActive(n.href) ? "text-brand-400" : "text-cream-200/60",
              )}
            >
              {isActive(n.href) && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand-400" />}
              <span className="relative">
                <n.icon className="h-5 w-5" />
                {n.href === "/printer" && <span className="absolute -right-1.5 -top-1">{printerDot}</span>}
              </span>
              <span className="w-full truncate text-center">{n.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
