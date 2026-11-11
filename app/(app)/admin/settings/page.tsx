"use client";
import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/client";
import type { OrderDetail, StoreInfo } from "@/lib/types";
import { buildReceipt, receiptText } from "@/lib/receipt";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, PageHeader, Spinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

const SAMPLE: OrderDetail = {
  id: 0, code: "TH-20261111-0042", tableLabel: "5", customerName: null, status: "paid",
  subtotal: 27000, total: 27000, createdAt: new Date().toISOString(), paidAt: new Date().toISOString(),
  businessDate: "2026-11-11", createdByName: "Budi",
  items: [
    { id: 1, productId: 1, productName: "Indomie Single", variantName: "Standar", unitPrice: 10000, qty: 2, note: null, lineTotal: 20000,
      options: [{ groupName: "Rasa Indomie", optionName: "Soto Ayam", price: 0, optionId: 1 }] },
    { id: 2, productId: 2, productName: "Teh", variantName: "Standar", unitPrice: 7000, qty: 1, note: null, lineTotal: 7000,
      options: [{ groupName: "Rasa Teh", optionName: "Teh Tarik", price: 0, optionId: 2 }, { groupName: "Suhu", optionName: "Dingin", price: 0, optionId: 3 }] },
  ],
  payment: { method: "cash", amountDue: 27000, amountReceived: 50000, changeAmount: 23000, receivedByName: "Budi", createdAt: new Date().toISOString() },
  void: null,
};

const FIELDS: { key: keyof StoreInfo; label: string; hint?: string }[] = [
  { key: "store_name", label: "Nama toko" },
  { key: "store_address", label: "Alamat" },
  { key: "store_hours", label: "Jam buka (dicetak di struk)" },
  { key: "receipt_footer", label: "Catatan kaki struk" },
  {
    key: "day_cutoff",
    label: "Jam pergantian hari bisnis (HH:MM)",
    hint: "Transaksi sebelum jam ini masuk ke hari bisnis sebelumnya. Default 06:00.",
  },
];

export default function SettingsPage() {
  const { reload } = useApp();
  const toast = useToast();
  const [s, setS] = useState<StoreInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ settings: StoreInfo }>("/api/admin/settings")
      .then((r) => setS(r.settings))
      .catch((e) => toast(errMsg(e), "error"));
  }, [toast]);

  async function save() {
    if (!s) return;
    setBusy(true);
    try {
      const r = await api<{ settings: StoreInfo }>("/api/admin/settings", { method: "PUT", body: s });
      setS(r.settings);
      await reload();
      toast("Pengaturan disimpan", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!s)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl p-4">
      <PageHeader title="Pengaturan Toko" />
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Card className="p-5">
          {FIELDS.map((f) => (
            <div key={f.key} className="mb-4">
              <Label>{f.label}</Label>
              <Input value={s[f.key]} maxLength={80} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />
              {f.hint && <p className="mt-1 text-xs text-stone-500">{f.hint}</p>}
            </div>
          ))}
          <Button size="lg" loading={busy} onClick={save}>
            Simpan Pengaturan
          </Button>
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-bold">Pratinjau struk</h2>
          <pre className="w-fit rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 font-mono text-[12px] leading-[1.35]">
            {receiptText(buildReceipt(SAMPLE, s))}
          </pre>
        </Card>
      </div>
    </div>
  );
}
