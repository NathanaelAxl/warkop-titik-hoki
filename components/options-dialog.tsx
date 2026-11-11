"use client";
import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { optionPriceFor, type MenuOption, type MenuOptionGroup, type MenuProduct, type MenuVariant } from "@/lib/types";

export type OptionChoice = {
  variant: MenuVariant;
  options: { group: MenuOptionGroup; option: MenuOption; price: number }[];
  qty: number;
  note: string;
};

const QUICK_NOTES = ["Pedas", "Tidak pedas", "Kurang manis", "Tanpa es", "Dibungkus"];

export function OptionsDialog({
  product,
  onClose,
  onAdd,
}: {
  product: MenuProduct;
  onClose: () => void;
  onAdd: (c: OptionChoice) => void;
}) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  function toggle(g: MenuOptionGroup, optId: number) {
    setSelected((s) => {
      const cur = s[g.id] ?? [];
      if (g.maxSelect === 1) return { ...s, [g.id]: cur[0] === optId && !g.isRequired ? [] : [optId] };
      if (cur.includes(optId)) return { ...s, [g.id]: cur.filter((x) => x !== optId) };
      if (g.maxSelect != null && cur.length >= g.maxSelect) return s;
      return { ...s, [g.id]: [...cur, optId] };
    });
  }

  const missing = product.optionGroups.filter(
    (g) => (selected[g.id]?.length ?? 0) < Math.max(g.minSelect, g.isRequired ? 1 : 0),
  );

  const chosen = useMemo(
    () =>
      product.optionGroups.flatMap((g) =>
        (selected[g.id] ?? []).map((oid) => {
          const option = g.options.find((o) => o.id === oid)!;
          return { group: g, option, price: optionPriceFor(variant.name, option) };
        }),
      ),
    [product.optionGroups, selected, variant.name],
  );
  const unit = variant.price + chosen.reduce((a, c) => a + c.price, 0);

  function submit() {
    if (missing.length) {
      setShowErrors(true);
      return;
    }
    onAdd({ variant, options: chosen, qty, note: note.trim() });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={product.name}
      className="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Kurangi">
              <Minus className="h-5 w-5" />
            </Button>
            <span className="w-10 text-center text-2xl font-bold">{qty}</span>
            <Button variant="secondary" size="icon" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Tambah">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <Button size="lg" onClick={submit}>
            Tambah · Rp {rupiah(unit * qty)}
          </Button>
        </div>
      }
    >
      {product.variants.length > 1 && (
        <Section title="Ukuran / Varian" required>
          {product.variants.map((v) => (
            <Chip key={v.id} active={v.id === variant.id} onClick={() => setVariantId(v.id)}>
              {v.name} <span className="opacity-70">· {rupiah(v.price)}</span>
            </Chip>
          ))}
        </Section>
      )}

      {product.optionGroups.map((g) => {
        const req = Math.max(g.minSelect, g.isRequired ? 1 : 0) > 0;
        const err = showErrors && missing.some((m) => m.id === g.id);
        return (
          <Section
            key={g.id}
            title={g.name}
            required={req}
            hint={g.maxSelect === 1 ? "pilih 1" : g.maxSelect ? `maks. ${g.maxSelect}` : "boleh lebih dari satu"}
            error={err}
          >
            {g.options.map((o) => {
              const p = optionPriceFor(variant.name, o);
              return (
                <Chip key={o.id} active={(selected[g.id] ?? []).includes(o.id)} onClick={() => toggle(g, o.id)}>
                  {o.name}
                  {p > 0 && <span className="opacity-70"> +{rupiah(p)}</span>}
                </Chip>
              );
            })}
          </Section>
        );
      })}

      <Section title="Catatan">
        <div className="w-full">
          <Input value={note} maxLength={120} placeholder="Contoh: telur setengah matang" onChange={(e) => setNote(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_NOTES.map((n) => (
              <button
                key={n}
                onClick={() => setNote((x) => (x ? `${x}, ${n}` : n))}
                className="h-9 rounded-lg bg-stone-100 px-3 text-sm text-stone-700 active:bg-stone-200"
              >
                + {n}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </Dialog>
  );
}

function Section({
  title,
  required,
  hint,
  error,
  children,
}: {
  title: string;
  required?: boolean;
  hint?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mb-4 rounded-xl", error && "bg-red-50 p-2 ring-2 ring-red-300")}>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-bold">{title}</span>
        {required && <span className="rounded bg-brand-100 px-1.5 text-xs font-semibold text-brand-800">Wajib</span>}
        {hint && <span className="text-xs text-stone-500">{hint}</span>}
        {error && <span className="text-xs font-semibold text-red-600">Belum dipilih</span>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition",
        active ? "border-brand-500 bg-brand-500 text-white" : "border-stone-200 bg-white text-stone-800 hover:border-stone-300",
      )}
    >
      {children}
    </button>
  );
}
