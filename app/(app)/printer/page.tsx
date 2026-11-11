"use client";
import { useEffect, useState } from "react";
import { Bluetooth, BluetoothOff, Printer, RotateCw } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errMsg } from "@/lib/client";
import {
  bluetoothSupported,
  connectPrinter,
  disconnectPrinter,
  forgetPrinter,
  getPrinterState,
  printTest,
  reconnectPrinter,
  subscribePrinter,
  type PrinterState,
} from "@/lib/printer";
import { buildTestReceipt, receiptText } from "@/lib/receipt";

export default function PrinterPage() {
  const { store } = useApp();
  const toast = useToast();
  const [st, setSt] = useState<PrinterState>({ status: "disconnected", name: null });
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState<"" | "connect" | "test" | "reconnect">("");

  useEffect(() => {
    setSupported(bluetoothSupported());
    setSt(getPrinterState());
    return subscribePrinter(setSt);
  }, []);

  async function run(kind: typeof busy, fn: () => Promise<unknown>, okMsg?: string) {
    setBusy(kind);
    try {
      await fn();
      if (okMsg) toast(okMsg, "success");
    } catch (e) {
      const m = errMsg(e);
      // User menutup jendela pemilihan perangkat: bukan error
      if (!/cancel/i.test(m)) toast(m, "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <PageHeader title="Pengaturan Printer" />
      {!supported && (
        <p className="mb-4 rounded-xl bg-amber-50 p-4 text-amber-900">
          Browser ini tidak mendukung Web Bluetooth. Gunakan <b>Google Chrome di Android</b> dan buka aplikasi lewat alamat{" "}
          <b>https://</b> (misalnya domain .vercel.app).
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            {st.status === "connected" ? (
              <Bluetooth className="h-10 w-10 text-emerald-600" />
            ) : (
              <BluetoothOff className="h-10 w-10 text-stone-400" />
            )}
            <div>
              <div className="text-lg font-bold">
                {st.status === "connected" ? "Terhubung" : st.status === "connecting" ? "Menghubungkan…" : "Tidak terhubung"}
              </div>
              <div className="text-sm text-stone-500">{st.name ? `Printer terakhir: ${st.name}` : "Belum ada printer tersimpan"}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="lg" disabled={!supported} loading={busy === "connect"} onClick={() => run("connect", connectPrinter, "Printer terhubung")}>
              <Bluetooth className="h-5 w-5" /> {st.name ? "Pilih / Ganti Printer" : "Hubungkan Printer"}
            </Button>
            {st.name && st.status !== "connected" && (
              <Button
                variant="outline"
                size="lg"
                disabled={!supported}
                loading={busy === "reconnect"}
                onClick={() =>
                  run("reconnect", async () => {
                    if (!(await reconnectPrinter())) throw new Error("Gagal menyambung otomatis. Tekan “Pilih / Ganti Printer”.");
                  }, "Printer terhubung")
                }
              >
                <RotateCw className="h-5 w-5" /> Sambungkan ke {st.name}
              </Button>
            )}
            <Button variant="outline" size="lg" disabled={!supported} loading={busy === "test"} onClick={() => run("test", () => printTest(store), "Tes cetak terkirim")}>
              <Printer className="h-5 w-5" /> Tes Cetak
            </Button>
            {st.status === "connected" && (
              <Button variant="ghost" onClick={disconnectPrinter}>
                Putuskan
              </Button>
            )}
            {st.name && (
              <Button variant="ghost" className="text-red-600" onClick={forgetPrinter}>
                Lupakan printer
              </Button>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-bold">Pratinjau tes cetak (58mm)</h2>
          <pre className="w-fit rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 font-mono text-[12px] leading-[1.35]">
            {receiptText(buildTestReceipt(store))}
          </pre>
        </Card>
      </div>
      <Card className="mt-4 p-5 text-sm text-stone-700">
        <h2 className="mb-2 font-bold">Tips</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nyalakan printer dan Bluetooth tablet. Tidak perlu pairing lewat menu Bluetooth Android.</li>
          <li>Printer harus mendukung ESC/POS dan Bluetooth Low Energy (BLE) agar bisa dipakai dari Chrome.</li>
          <li>Setelah tablet tidur atau halaman dimuat ulang, aplikasi mencoba menyambung lagi otomatis saat mencetak. Kalau gagal, tekan “Pilih / Ganti Printer”.</li>
          <li>Kalau struk gagal tercetak, transaksi tetap tersimpan; cetak ulang dari menu Riwayat.</li>
        </ul>
      </Card>
    </div>
  );
}
