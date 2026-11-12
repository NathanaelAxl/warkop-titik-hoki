"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Minus, Pencil, Plus, Search, ShoppingBasket, Trash2, X } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { fmtTime, rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MenuCategory, MenuProduct, OrderDetail, OrderItemOption } from "@/lib/types";
import { categoryStyle, productEmoji } from "@/lib/menu-style";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Dialog } from "./ui/dialog";
import { Badge, Spinner } from "./ui/misc";
import { useToast } from "./ui/toast";
import { OptionsDialog, type OptionChoice } from "./options-dialog";
import { PayDialog } from "./pay-dialog";
import { PaidDialog, ReceiptPreview } from "./receipt-dialog";

type CartItem = {
  uid: string;
  id?: number; // ada = item yang sudah tersimpan di server
  productId: number | null;
  variantId?: number;
  optionIds: number[];
  productName: string;
  variantName: string;
  unitPrice: number;
  options: OrderItemOption[];
  qty: number;
  note: string;
};

let uidSeq = 0;
const uid = () => `c${++uidSeq}`;

function sig(i: CartItem) {
  const opts = i.options.map((o) => `${o.optionId ?? o.optionName}:${o.price}`).sort().join(",");
  return [i.productId ?? i.productName, i.variantName, i.unitPrice, opts, i.note.trim().toLowerCase()].join("|");
}
const lineTotal = (i: CartItem) => (i.unitPrice + i.options.reduce((a, o) => a + o.price, 0)) * i.qty;
const displayName = (i: { productName: string; variantName: string }) =>
  i.variantName === "Standar" ? i.productName : `${i.productName} (${i.variantName})`;

function priceLabel(p: MenuProduct) {
  const prices = [...new Set(p.variants.map((v) => v.price))];
  return prices.map(rupiah).join(" / ");
}

function fromOrder(o: OrderDetail): CartItem[] {
  return o.items.map((it) => ({
    uid: uid(),
    id: it.id,
    productId: it.productId,
    optionIds: [],
    productName: it.productName,
    variantName: it.variantName,
    unitPrice: it.unitPrice,
    options: it.options,
    qty: it.qty,
    note: it.note ?? "",
  }));
}

export function OrderScreen({ orderId }: { orderId: number | null }) {
  const router = useRouter();
  const toast = useToast();
  const [menu, setMenu] = useState<MenuCategory[] | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [id, setId] = useState<number | null>(orderId);
  const [loadError, setLoadError] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [cat, setCat] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [optionsFor, setOptionsFor] = useState<MenuProduct | null>(null);
  const [noteEdit, setNoteEdit] = useState<CartItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState<OrderDetail | null>(null);
  const [paid, setPaid] = useState<OrderDetail | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // Di HP keranjang tampil sebagai layar penuh yang dibuka dari bar bawah
  const [cartOpen, setCartOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const tableRef = useRef<HTMLInputElement>(null);

  const applyOrder = useCallback((o: OrderDetail) => {
    if (o.status !== "open") setCartOpen(true);
    setOrder(o);
    setTableLabel(o.tableLabel ?? "");
    setCustomerName(o.customerName ?? "");
    setCart(fromOrder(o));
    setDirty(false);
  }, []);

  useEffect(() => {
    api<{ categories: MenuCategory[] }>("/api/menu")
      .then((r) => setMenu(r.categories))
      .catch((e) => setLoadError(errMsg(e)));
    if (orderId) {
      api<{ order: OrderDetail }>(`/api/orders/${orderId}`)
        .then((r) => applyOrder(r.order))
        .catch((e) => setLoadError(errMsg(e)));
    } else if (window.matchMedia("(min-width: 768px)").matches) {
      setTimeout(() => tableRef.current?.focus(), 100);
    }
  }, [orderId, applyOrder]);

  // Peringatan kalau menutup tab dengan perubahan belum disimpan
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const products = useMemo(() => {
    if (!menu) return [];
    const q = search.trim().toLowerCase();
    const all = menu.flatMap((c) => c.products);
    if (q) return all.filter((p) => p.name.toLowerCase().includes(q));
    return cat === "all" ? all : menu.find((c) => c.id === cat)?.products ?? [];
  }, [menu, cat, search]);

  // Nama kategori per produk, untuk ikon & warna kartu menu
  const catName = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of menu ?? []) for (const p of c.products) m.set(p.id, c.name);
    return m;
  }, [menu]);

  const total = cart.reduce((a, i) => a + lineTotal(i), 0);
  const itemCount = cart.reduce((a, i) => a + i.qty, 0);
  const readOnly = !!order && order.status !== "open";

  function addItem(item: Omit<CartItem, "uid">) {
    setCart((c) => {
      const s = sig({ ...item, uid: "" });
      const idx = c.findIndex((x) => sig(x) === s);
      if (idx >= 0) {
        const copy = [...c];
        copy[idx] = { ...copy[idx], qty: Math.min(99, copy[idx].qty + item.qty) };
        return copy;
      }
      return [...c, { ...item, uid: uid() }];
    });
    setDirty(true);
    setBump((b) => b + 1);
  }

  function tapProduct(p: MenuProduct) {
    if (readOnly) return;
    if (p.variants.length > 1 || p.optionGroups.length > 0) {
      setOptionsFor(p);
      return;
    }
    const v = p.variants[0];
    addItem({ productId: p.id, variantId: v.id, optionIds: [], productName: p.name, variantName: v.name, unitPrice: v.price, options: [], qty: 1, note: "" });
  }

  function addFromOptions(p: MenuProduct, c: OptionChoice) {
    addItem({
      productId: p.id,
      variantId: c.variant.id,
      optionIds: c.options.map((o) => o.option.id),
      productName: p.name,
      variantName: c.variant.name,
      unitPrice: c.variant.price,
      options: c.options.map((o) => ({ groupName: o.group.name, optionName: o.option.name, price: o.price, optionId: o.option.id })),
      qty: c.qty,
      note: c.note,
    });
    setOptionsFor(null);
  }

  function changeQty(u: string, d: number) {
    setCart((c) => c.flatMap((i) => (i.uid !== u ? [i] : i.qty + d <= 0 ? [] : [{ ...i, qty: Math.min(99, i.qty + d) }])));
    setDirty(true);
  }

  function removeItem(u: string) {
    setCart((c) => c.filter((i) => i.uid !== u));
    setDirty(true);
  }

  function saveNote(u: string, note: string) {
    // Setelah catatan diganti, gabungkan kalau jadi sama dengan item lain
    setCart((c) => {
      const updated = c.map((i) => (i.uid === u ? { ...i, note } : i));
      const merged: CartItem[] = [];
      for (const it of updated) {
        const m = merged.find((x) => sig(x) === sig(it));
        if (m) m.qty = Math.min(99, m.qty + it.qty);
        else merged.push({ ...it });
      }
      return merged;
    });
    setDirty(true);
    setNoteEdit(null);
  }

  /** Simpan ke server. Mengembalikan detail pesanan terbaru, atau null kalau gagal. */
  async function save(): Promise<OrderDetail | null> {
    if (!tableLabel.trim() && !customerName.trim()) {
      toast("Isi nomor meja atau nama pelanggan dulu", "error");
      setCartOpen(true);
      setTimeout(() => tableRef.current?.focus(), 50);
      return null;
    }
    if (cart.length === 0 && !id) {
      toast("Pesanan masih kosong", "error");
      return null;
    }
    const body = {
      tableLabel: tableLabel.trim() || null,
      customerName: customerName.trim() || null,
      items: cart.map((i) =>
        i.id
          ? { id: i.id, qty: i.qty, note: i.note || null }
          : { productId: i.productId, variantId: i.variantId, optionIds: i.optionIds, qty: i.qty, note: i.note || null },
      ),
    };
    setSaving(true);
    try {
      let detail: OrderDetail;
      if (id) {
        detail = (await api<{ order: OrderDetail }>(`/api/orders/${id}`, { method: "PATCH", body })).order;
      } else {
        const r = await api<{ id: number }>("/api/orders", { body });
        detail = (await api<{ order: OrderDetail }>(`/api/orders/${r.id}`)).order;
        setId(r.id);
        window.history.replaceState(null, "", `/order/${r.id}`);
      }
      applyOrder(detail);
      return detail;
    } catch (e) {
      // Data tetap di layar, tidak hilang diam-diam
      toast(errMsg(e), "error");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function onSave() {
    const d = await save();
    if (d) {
      toast(`Pesanan ${d.tableLabel ? "Meja " + d.tableLabel : d.customerName} tersimpan`, "success");
      router.push("/");
    }
  }

  async function onPay() {
    if (cart.length === 0) return toast("Pesanan masih kosong", "error");
    const d = dirty || !id ? await save() : order;
    if (d) setPaying(d);
  }

  function back() {
    if (dirty) setLeaveOpen(true);
    else router.push("/");
  }

  if (loadError)
    return (
      <div className="p-6">
        <p className="mb-4 rounded-xl bg-red-50 p-4 font-medium text-red-700">{loadError}</p>
        <Link href="/">
          <Button variant="outline">Kembali</Button>
        </Link>
      </div>
    );

  if (!menu || (orderId && !order))
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );

  return (
    <div className="flex h-full min-h-0">
      {/* Kolom kiri: menu */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-cream-200 bg-white/85 p-2 backdrop-blur md:p-3">
          <Button variant="ghost" size="icon" onClick={back} aria-label="Kembali">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari menu…" className="pl-10" />
            {search && (
              <button className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-stone-400" onClick={() => setSearch("")} aria-label="Hapus pencarian">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div className="scroll-thin flex gap-2 overflow-x-auto border-b border-cream-200 bg-white/85 px-2 py-2 backdrop-blur md:px-3">
          <CatTab active={cat === "all" && !search} emoji="✨" onClick={() => { setCat("all"); setSearch(""); }}>
            Semua
          </CatTab>
          {menu.map((c) => {
            const s = categoryStyle(c.name);
            return (
              <CatTab key={c.id} active={cat === c.id && !search} emoji={s.emoji} activeClass={s.tone.chip} onClick={() => { setCat(c.id); setSearch(""); }}>
                {c.name}
              </CatTab>
            );
          })}
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2 md:p-3">
          {products.length === 0 ? (
            <p className="py-10 text-center text-stone-500">Menu tidak ditemukan</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => {
                const inCart = cart.filter((i) => i.productId === p.id).reduce((a, i) => a + i.qty, 0);
                const cn_ = catName.get(p.id) ?? "";
                const { tone } = categoryStyle(cn_);
                const hasOpts = p.optionGroups.length > 0 || p.variants.length > 1;
                return (
                  <button
                    key={p.id}
                    disabled={readOnly}
                    onClick={() => tapProduct(p)}
                    className={cn(
                      "relative flex min-h-[7.25rem] flex-col rounded-2xl border bg-gradient-to-br to-white p-3 text-left shadow-[0_1px_2px_rgb(74_46_31/0.06),0_4px_12px_-6px_rgb(74_46_31/0.15)] transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] disabled:opacity-50",
                      tone.card,
                      inCart > 0 ? "border-brand-400 ring-2 ring-brand-400/60" : "border-cream-200",
                    )}
                  >
                    {inCart > 0 && (
                      <span className="bg-brand-gradient absolute -right-1.5 -top-1.5 flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-extrabold text-white shadow-md ring-2 ring-white">
                        {inCart}
                      </span>
                    )}
                    <span className={cn("mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-2xl ring-1", tone.bubble)} aria-hidden>
                      {productEmoji(p.name, cn_)}
                    </span>
                    <span className="text-[15px] font-bold leading-snug text-espresso-900 md:text-base">{p.name}</span>
                    <span className="mt-auto flex flex-wrap items-center justify-between gap-x-2 pt-1.5 text-sm">
                      <span className={cn("font-extrabold", tone.price)}>{priceLabel(p)}</span>
                      {hasOpts && <span className="rounded-full bg-white/80 px-1.5 text-[11px] font-semibold text-stone-500 ring-1 ring-cream-200">pilihan</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bar keranjang untuk HP */}
        <div className="border-t border-cream-200 bg-white/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <button
            onClick={() => setCartOpen(true)}
            className="bg-espresso-gradient flex h-14 w-full items-center gap-3 rounded-2xl px-4 text-white shadow-lg shadow-espresso-900/30 active:scale-[0.99]"
          >
            <span key={bump} className="relative animate-[pop_.25s_ease-out]">
              <ShoppingBasket className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="bg-brand-gradient absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </span>
            <span className="flex-1 text-left">
              <span className="block text-sm font-semibold leading-tight">
                {itemCount > 0 ? `${itemCount} item` : "Keranjang kosong"}
                {dirty && <span className="font-normal text-brand-300"> · belum disimpan</span>}
              </span>
              <span className="block text-xs text-cream-200/70">{tableLabel ? `Meja ${tableLabel}` : customerName || "Meja / nama belum diisi"}</span>
            </span>
            <span className="text-lg font-extrabold text-brand-300">Rp {rupiah(total)}</span>
            <ChevronUp className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Kolom kanan: keranjang (di HP: layar penuh) */}
      <aside
        className={cn(
          "flex-col bg-white md:static md:z-auto md:flex md:w-[340px] md:shrink-0 md:border-l md:border-cream-200 md:shadow-[-8px_0_24px_-12px_rgb(74_46_31/0.15)] lg:w-[380px] xl:w-[420px]",
          cartOpen ? "fixed inset-0 z-40 flex" : "hidden",
        )}
      >
        <div className="border-b border-cream-200 bg-cream-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button onClick={() => setCartOpen(false)} className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100 md:hidden" aria-label="Kembali ke menu">
              <ChevronDown className="h-6 w-6" />
            </button>
            <span className="mr-auto font-bold">{order ? order.code : "Pesanan Baru"}</span>
            {order && (
              <span className="flex items-center gap-2 text-xs text-stone-500">
                {fmtTime(order.createdAt)}
                <Badge color={order.status === "open" ? "brand" : order.status === "paid" ? "green" : "red"}>
                  {order.status === "open" ? "Terbuka" : order.status === "paid" ? "Dibayar" : "Dibatalkan"}
                </Badge>
              </span>
            )}
          </div>
          <div className="grid grid-cols-[96px_1fr] gap-2">
            <Input
              ref={tableRef}
              placeholder="Meja"
              inputMode="numeric"
              value={tableLabel}
              maxLength={40}
              disabled={readOnly}
              onChange={(e) => {
                setTableLabel(e.target.value);
                setDirty(true);
              }}
            />
            <Input
              placeholder="Nama pelanggan"
              value={customerName}
              maxLength={40}
              disabled={readOnly}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setDirty(true);
              }}
            />
          </div>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {readOnly && order ? (
            <div className="p-3">
              <p className="mb-3 rounded-xl bg-stone-100 p-3 text-sm">
                Pesanan ini sudah {order.status === "paid" ? "dibayar" : "dibatalkan"} dan tidak bisa diubah.
              </p>
              <ReceiptPreview order={order} />
            </div>
          ) : cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-stone-400">
              <span className="mb-1 flex h-20 w-20 items-center justify-center rounded-full bg-cream-100 text-4xl ring-1 ring-cream-200">🧺</span>
              <p>
                Ketuk menu <span className="hidden md:inline">di kiri </span>untuk menambah item
              </p>
              <Button variant="outline" className="mt-2 md:hidden" onClick={() => setCartOpen(false)}>
                Pilih Menu
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-cream-200">
              {cart.map((i) => (
                <li key={i.uid} className="animate-fade-up px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-xl ring-1 ring-cream-200" aria-hidden>
                      {productEmoji(i.productName, i.productId ? catName.get(i.productId) : undefined)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-snug">{displayName(i)}</div>
                      {i.options.length > 0 && (
                        <div className="text-xs text-stone-500">
                          {i.options.map((o) => (o.price > 0 ? `+${o.optionName}` : o.optionName)).join(", ")}
                        </div>
                      )}
                      <button onClick={() => setNoteEdit(i)} className="mt-0.5 flex min-h-7 items-center gap-1 text-xs text-sky-700">
                        <Pencil className="h-3 w-3" />
                        {i.note ? <i className="text-stone-700">“{i.note}”</i> : "catatan"}
                      </button>
                    </div>
                    <div className="shrink-0 text-right font-bold">{rupiah(lineTotal(i))}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Button variant="secondary" size="icon" onClick={() => changeQty(i.uid, -1)} aria-label="Kurangi">
                      <Minus className="h-5 w-5" />
                    </Button>
                    <span className="w-8 text-center text-lg font-bold">{i.qty}</span>
                    <Button variant="secondary" size="icon" onClick={() => changeQty(i.uid, 1)} aria-label="Tambah">
                      <Plus className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="ml-auto text-red-600" onClick={() => removeItem(i.uid)} aria-label="Hapus item">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-cream-200 bg-cream-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-end justify-between gap-2">
            <span className="text-sm text-stone-500 md:text-base">
              Total · {itemCount} item {dirty && <span className="block font-semibold text-amber-600 xl:inline">(belum disimpan)</span>}
            </span>
            <span className="text-2xl font-extrabold md:text-3xl">Rp {rupiah(readOnly && order ? order.total : total)}</span>
          </div>
          {readOnly ? (
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full">
                Kembali
              </Button>
            </Link>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" onClick={onSave} loading={saving && !paying} disabled={saving}>
                  Simpan
                </Button>
                <Button variant="success" size="lg" onClick={onPay} disabled={saving || cart.length === 0}>
                  Bayar
                </Button>
              </div>
              {id && (
                <button onClick={() => setVoidOpen(true)} className="mt-2 min-h-9 w-full text-sm text-red-600">
                  Batalkan pesanan ini
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      {optionsFor && <OptionsDialog product={optionsFor} onClose={() => setOptionsFor(null)} onAdd={(c) => addFromOptions(optionsFor, c)} />}
      {noteEdit && <NoteDialog item={noteEdit} onClose={() => setNoteEdit(null)} onSave={(n) => saveNote(noteEdit.uid, n)} />}
      {paying && (
        <PayDialog
          order={paying}
          onClose={() => setPaying(null)}
          onPaid={(o) => {
            setPaying(null);
            setDirty(false);
            setOrder(o);
            setPaid(o);
          }}
        />
      )}
      {paid && <PaidDialog order={paid} onDone={() => router.push("/")} />}
      {voidOpen && id && (
        <VoidOpenDialog
          orderId={id}
          onClose={() => setVoidOpen(false)}
          onDone={() => {
            toast("Pesanan dibatalkan", "success");
            setDirty(false);
            router.push("/");
          }}
        />
      )}
      <Dialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Perubahan belum disimpan"
        footer={
          <>
            <Button variant="outline" onClick={() => router.push("/")}>
              Buang perubahan
            </Button>
            <Button
              onClick={async () => {
                setLeaveOpen(false);
                await onSave();
              }}
            >
              Simpan
            </Button>
          </>
        }
      >
        Pesanan ini punya perubahan yang belum disimpan. Simpan dulu sebelum keluar?
      </Dialog>
    </div>
  );
}

function CatTab({
  active,
  onClick,
  emoji,
  activeClass = "bg-espresso-800",
  children,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  activeClass?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-11 shrink-0 items-center gap-1.5 rounded-full pl-2 pr-4 text-sm font-semibold transition active:scale-95",
        active ? cn(activeClass, "text-white shadow-md") : "bg-cream-100 text-espresso-800 ring-1 ring-cream-200 hover:bg-cream-200",
      )}
    >
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-base", active ? "bg-white/25" : "bg-white")}>{emoji}</span>
      {children}
    </button>
  );
}

function NoteDialog({ item, onClose, onSave }: { item: CartItem; onClose: () => void; onSave: (n: string) => void }) {
  const [note, setNote] = useState(item.note);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Catatan: ${displayName(item)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => onSave(note.trim())}>Simpan Catatan</Button>
        </>
      }
    >
      <Textarea rows={3} autoFocus maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: pedas, tanpa sayur" />
    </Dialog>
  );
}

function VoidOpenDialog({ orderId, onClose, onDone }: { orderId: number; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    try {
      await api(`/api/orders/${orderId}/void`, { body: { reason: reason.trim() } });
      onDone();
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Batalkan pesanan?"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Tidak
          </Button>
          <Button variant="destructive" loading={busy} onClick={submit}>
            Ya, batalkan
          </Button>
        </>
      }
    >
      <p className="mb-3 text-stone-600">Pesanan yang belum dibayar akan dibatalkan dan hilang dari daftar pesanan terbuka.</p>
      <Input placeholder="Alasan (opsional), misal: pelanggan batal" value={reason} onChange={(e) => setReason(e.target.value)} />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Dialog>
  );
}
