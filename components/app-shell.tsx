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

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 bg-stone-900 px-3 text-white">
        <Link href="/" className="mr-2 flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-9 w-9" />
          <span className="hidden font-extrabold leading-tight xl:block">Titik Hoki</span>
        </Link>
        <nav className="scroll-thin flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.filter((n) => !n.owner || user.role === "owner").map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition",
                isActive(n.href) ? "bg-brand-600 text-white" : "text-stone-300 hover:bg-stone-800",
              )}
            >
              <n.icon className="h-5 w-5" />
              <span className="hidden lg:inline">{n.label}</span>
              {n.href === "/printer" && (
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    printer.status === "connected" ? "bg-emerald-400" : printer.status === "connecting" ? "bg-amber-400" : "bg-stone-500",
                  )}
                />
              )}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden text-right text-sm leading-tight sm:block">
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs uppercase text-stone-400">{user.role}</div>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="flex h-11 items-center gap-2 rounded-xl bg-stone-800 px-3 text-sm font-semibold hover:bg-stone-700"
            title="Ganti pengguna / Logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden md:inline">Ganti Pengguna</span>
          </button>
        </div>
      </header>
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white">
          <WifiOff className="h-4 w-4" />
          Internet terputus! Pesanan yang belum disimpan tetap di layar — simpan lagi setelah koneksi kembali.
        </div>
      )}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
