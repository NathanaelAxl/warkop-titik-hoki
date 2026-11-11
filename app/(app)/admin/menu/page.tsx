"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MenuCategory, MenuProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Switch } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Card, EmptyState, PageHeader, Spinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

type AdminOption = { id: number; name: string; price: number; priceJumbo: number | null };
type AdminGroup = { id: number; name: string; isRequired: boolean; minSelect: number; maxSelect: number | null; options: AdminOption[] };

export default function AdminMenuPage() {
  const toast = useToast();
  const [cats, setCats] = useState<MenuCategory[] | null>(null);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [tab, setTab] = useState<"menu" | "groups">("menu");
  const [catId, setCatId] = useState<number | null>(null);
  const [editCat, setEditCat] = useState<MenuCategory | "new" | null>(null);
  const [editProd, setEditProd] = useState<MenuProduct | "new" | null>(null);
  const [editGroup, setEditGroup] = useState<AdminGroup | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ categories: MenuCategory[]; optionGroups: AdminGroup[] }>("/api/admin/products");
      setCats(r.categories);
      setGroups(r.optionGroups);
      setCatId((c) => (c && r.categories.some((x) => x.id === c) ? c : r.categories[0]?.id ?? null));
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, ok?: string) {
    try {
      await fn();
      if (ok) toast(ok, "success");
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  function move<T extends { id: number }>(list: T[], idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return null;
    const copy = [...list];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    return copy.map((x) => x.id);
  }

  const cat = cats?.find((c) => c.id === catId) ?? null;

  if (!cats)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );

  return (
    <div className="p-3 md:p-4">
      <PageHeader title="Kelola Menu">
        <div className="flex rounded-xl bg-white p-1">
          {(
            [
              ["menu", "Kategori & Menu"],
              ["groups", "Grup Pilihan"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("h-10 rounded-lg px-4 text-sm font-semibold", tab === k ? "bg-stone-900 text-white" : "text-stone-600")}>
              {l}
            </button>
          ))}
        </div>
      </PageHeader>

      {tab === "menu" ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">Kategori</h2>
              <Button size="sm" onClick={() => setEditCat("new")}>
                <Plus className="h-4 w-4" /> Kategori
              </Button>
            </div>
            <ul className="space-y-1">
              {cats.map((c, i) => (
                <li
                  key={c.id}
                  className={cn("flex items-center gap-1 rounded-xl p-1 pl-3", c.id === catId ? "bg-brand-100" : "hover:bg-stone-100")}
                >
                  <button className="min-h-11 flex-1 text-left" onClick={() => { setCatId(c.id); if (window.innerWidth < 1024) document.getElementById("menu-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                    <span className={cn("font-semibold", !c.isActive && "text-stone-400 line-through")}>{c.name}</span>
                    <span className="ml-2 text-xs text-stone-500">{c.products.length}</span>
                  </button>
                  <IconBtn label="Naik" onClick={() => { const ids = move(cats, i, -1); if (ids) act(() => api("/api/admin/categories", { method: "PUT", body: { ids } })); }}>
                    <ChevronUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Turun" onClick={() => { const ids = move(cats, i, 1); if (ids) act(() => api("/api/admin/categories", { method: "PUT", body: { ids } })); }}>
                    <ChevronDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Ubah" onClick={() => setEditCat(c)}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                </li>
              ))}
            </ul>
          </Card>

          <Card id="menu-list" className="scroll-mt-3 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">{cat ? `Menu: ${cat.name}` : "Menu"}</h2>
              <Button size="sm" disabled={!cat} onClick={() => setEditProd("new")}>
                <Plus className="h-4 w-4" /> Menu
              </Button>
            </div>
            {!cat || cat.products.length === 0 ? (
              <EmptyState title="Belum ada menu di kategori ini" />
            ) : (
              <ul className="divide-y divide-stone-100">
                {cat.products.map((p, i) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-1 gap-y-1 py-2 sm:flex-nowrap sm:gap-2">
                    <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                      <div className={cn("font-semibold", !p.isActive && "text-stone-400")}>
                        {p.name} {!p.isActive && <Badge color="red">Nonaktif</Badge>}
                      </div>
                      <div className="text-sm text-stone-500">
                        {p.variants.map((v) => `${v.name === "Standar" ? "" : v.name + " "}${rupiah(v.price)}`).join(" · ")}
                        {p.optionGroups.length > 0 && <span className="ml-2 text-xs">[{p.optionGroups.map((g) => g.name).join(", ")}]</span>}
                      </div>
                    </div>
                    <Switch
                      checked={p.isActive}
                      label={p.isActive ? "Aktif" : "Habis"}
                      onChange={(v) => act(() => api(`/api/admin/products/${p.id}`, { method: "PATCH", body: { isActive: v } }))}
                    />
                    <IconBtn label="Naik" onClick={() => { const ids = move(cat.products, i, -1); if (ids) act(() => api("/api/admin/products", { method: "PUT", body: { ids } })); }}>
                      <ChevronUp className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Turun" onClick={() => { const ids = move(cat.products, i, 1); if (ids) act(() => api("/api/admin/products", { method: "PUT", body: { ids } })); }}>
                      <ChevronDown className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Ubah" onClick={() => setEditProd(p)}>
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Grup Pilihan (rasa, topping, suhu, dll.)</h2>
            <Button size="sm" onClick={() => setEditGroup("new")}>
              <Plus className="h-4 w-4" /> Grup
            </Button>
          </div>
          <ul className="divide-y divide-stone-100">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {g.name} {g.isRequired ? <Badge color="brand">Wajib</Badge> : <Badge>Opsional</Badge>}{" "}
                    <span className="text-xs text-stone-500">{g.maxSelect === 1 ? "pilih 1" : g.maxSelect ? `maks ${g.maxSelect}` : "bebas"}</span>
                  </div>
                  <div className="text-sm text-stone-500">
                    {g.options
                      .map((o) => o.name + (o.price ? ` ${rupiah(o.price)}${o.priceJumbo != null ? "/" + rupiah(o.priceJumbo) : ""}` : ""))
                      .join(" · ")}
                  </div>
                </div>
                <IconBtn label="Ubah" onClick={() => setEditGroup(g)}>
                  <Pencil className="h-4 w-4" />
                </IconBtn>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editCat && (
        <CategoryDialog
          cat={editCat === "new" ? null : editCat}
          onClose={() => setEditCat(null)}
          onSaved={() => {
            setEditCat(null);
            load();
          }}
        />
      )}
      {editProd && cat && (
        <ProductDialog
          product={editProd === "new" ? null : editProd}
          categories={cats}
          defaultCategoryId={cat.id}
          groups={groups}
          onClose={() => setEditProd(null)}
          onSaved={() => {
            setEditProd(null);
            load();
          }}
        />
      )}
      {editGroup && (
        <GroupDialog
          group={editGroup === "new" ? null : editGroup}
          onClose={() => setEditGroup(null)}
          onSaved={() => {
            setEditGroup(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-200">
      {children}
    </button>
  );
}

function useSaver(onSaved: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg, "success");
      onSaved();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function CategoryDialog({ cat, onClose, onSaved }: { cat: MenuCategory | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [isActive, setActive] = useState(cat?.isActive ?? true);
  const { busy, run } = useSaver(onSaved);
  return (
    <Dialog
      open
      onClose={onClose}
      title={cat ? "Ubah Kategori" : "Kategori Baru"}
      footer={
        <>
          {cat && (
            <Button variant="ghost" className="mr-auto text-red-600" onClick={() => run(() => api(`/api/admin/categories/${cat.id}`, { method: "DELETE" }), "Kategori dihapus")}>
              <Trash2 className="h-4 w-4" /> Hapus
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            loading={busy}
            disabled={!name.trim()}
            onClick={() =>
              run(
                () =>
                  cat
                    ? api(`/api/admin/categories/${cat.id}`, { method: "PATCH", body: { name: name.trim(), isActive } })
                    : api("/api/admin/categories", { body: { name: name.trim(), isActive } }),
                "Kategori disimpan",
              )
            }
          >
            Simpan
          </Button>
        </>
      }
    >
      <Label>Nama kategori</Label>
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      <div className="mt-3">
        <Switch checked={isActive} onChange={setActive} label={isActive ? "Aktif (tampil di kasir)" : "Nonaktif (disembunyikan)"} />
      </div>
    </Dialog>
  );
}

type VariantRow = { id?: number; name: string; price: string };

function ProductDialog({
  product,
  categories,
  defaultCategoryId,
  groups,
  onClose,
  onSaved,
}: {
  product: MenuProduct | null;
  categories: MenuCategory[];
  defaultCategoryId: number;
  groups: AdminGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? defaultCategoryId);
  const [isActive, setActive] = useState(product?.isActive ?? true);
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => ({ id: v.id, name: v.name, price: String(v.price) })) ?? [{ name: "Standar", price: "" }],
  );
  const [groupIds, setGroupIds] = useState<number[]>(product?.optionGroups.map((g) => g.id) ?? []);
  const [confirmDel, setConfirmDel] = useState(false);
  const { busy, run } = useSaver(onSaved);

  const valid = name.trim() && variants.length > 0 && variants.every((v) => v.name.trim() && /^\d+$/.test(v.price));

  function save() {
    const body = {
      name: name.trim(),
      categoryId,
      isActive,
      variants: variants.map((v) => ({ id: v.id, name: v.name.trim(), price: Number(v.price) })),
      optionGroupIds: groupIds,
    };
    run(
      () => (product ? api(`/api/admin/products/${product.id}`, { method: "PATCH", body }) : api("/api/admin/products", { body })),
      "Menu disimpan",
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={product ? `Ubah: ${product.name}` : "Menu Baru"}
      className="max-w-2xl"
      footer={
        <>
          {product &&
            (confirmDel ? (
              <Button variant="destructive" className="mr-auto" onClick={() => run(() => api(`/api/admin/products/${product.id}`, { method: "DELETE" }), "Menu dihapus")}>
                Yakin hapus?
              </Button>
            ) : (
              <Button variant="ghost" className="mr-auto text-red-600" onClick={() => setConfirmDel(true)}>
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
            ))}
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button loading={busy} disabled={!valid} onClick={save}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Nama menu</Label>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Kategori</Label>
          <Select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3">
        <Switch checked={isActive} onChange={setActive} label={isActive ? "Aktif (tampil di kasir)" : "Nonaktif / habis"} />
      </div>

      <h3 className="mb-1 mt-4 font-bold">Varian & harga</h3>
      <p className="mb-2 text-xs text-stone-500">Menu tanpa ukuran cukup satu varian “Standar”. Varian bernama “Jumbo” memakai harga topping Jumbo.</p>
      {variants.map((v, i) => (
        <div key={i} className="mb-2 flex gap-2">
          <Input value={v.name} placeholder="Nama varian" onChange={(e) => setVariants((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
          <Input
            value={v.price}
            inputMode="numeric"
            placeholder="Harga"
            className="w-36"
            onChange={(e) => setVariants((x) => x.map((y, j) => (j === i ? { ...y, price: e.target.value.replace(/\D/g, "") } : y)))}
          />
          <Button variant="ghost" size="icon" disabled={variants.length === 1} onClick={() => setVariants((x) => x.filter((_, j) => j !== i))} aria-label="Hapus varian">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setVariants((x) => [...x, { name: "", price: "" }])}>
        <Plus className="h-4 w-4" /> Varian
      </Button>

      <h3 className="mb-2 mt-4 font-bold">Grup pilihan</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {groups.map((g) => {
          const on = groupIds.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => setGroupIds((x) => (on ? x.filter((y) => y !== g.id) : [...x, g.id]))}
              className={cn("min-h-11 rounded-xl border-2 px-3 py-2 text-left text-sm", on ? "border-brand-500 bg-brand-50" : "border-stone-200")}
            >
              <div className="font-semibold">
                {on ? "✓ " : ""}
                {g.name}
              </div>
              <div className="truncate text-xs text-stone-500">{g.options.map((o) => o.name).join(", ")}</div>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}

type OptRow = { id?: number; name: string; price: string; priceJumbo: string };

function GroupDialog({ group, onClose, onSaved }: { group: AdminGroup | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(group?.name ?? "");
  const [isRequired, setRequired] = useState(group?.isRequired ?? false);
  const [single, setSingle] = useState(group ? group.maxSelect === 1 : true);
  const [opts, setOpts] = useState<OptRow[]>(
    group?.options.map((o) => ({ id: o.id, name: o.name, price: String(o.price), priceJumbo: o.priceJumbo == null ? "" : String(o.priceJumbo) })) ?? [
      { name: "", price: "0", priceJumbo: "" },
    ],
  );
  const [confirmDel, setConfirmDel] = useState(false);
  const { busy, run } = useSaver(onSaved);
  const valid = name.trim() && opts.length > 0 && opts.every((o) => o.name.trim());

  function save() {
    const body = {
      name: name.trim(),
      isRequired,
      minSelect: isRequired ? 1 : 0,
      maxSelect: single ? 1 : null,
      options: opts.map((o) => ({
        id: o.id,
        name: o.name.trim(),
        price: Number(o.price || 0),
        priceJumbo: o.priceJumbo === "" ? null : Number(o.priceJumbo),
      })),
    };
    run(() => (group ? api(`/api/admin/option-groups/${group.id}`, { method: "PATCH", body }) : api("/api/admin/option-groups", { body })), "Grup pilihan disimpan");
  }

  const upd = (i: number, k: keyof OptRow, v: string) => setOpts((x) => x.map((y, j) => (j === i ? { ...y, [k]: v } : y)));

  return (
    <Dialog
      open
      onClose={onClose}
      title={group ? `Ubah: ${group.name}` : "Grup Pilihan Baru"}
      className="max-w-2xl"
      footer={
        <>
          {group &&
            (confirmDel ? (
              <Button variant="destructive" className="mr-auto" onClick={() => run(() => api(`/api/admin/option-groups/${group.id}`, { method: "DELETE" }), "Grup dihapus")}>
                Yakin hapus?
              </Button>
            ) : (
              <Button variant="ghost" className="mr-auto text-red-600" onClick={() => setConfirmDel(true)}>
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
            ))}
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button loading={busy} disabled={!valid} onClick={save}>
            Simpan
          </Button>
        </>
      }
    >
      <Label>Nama grup</Label>
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Rasa Indomie" />
      <div className="mt-3 flex flex-wrap gap-6">
        <Switch checked={isRequired} onChange={setRequired} label={isRequired ? "Wajib dipilih" : "Opsional"} />
        <Switch checked={single} onChange={setSingle} label={single ? "Pilih satu saja" : "Boleh pilih banyak"} />
      </div>
      <h3 className="mb-1 mt-4 font-bold">Isi pilihan</h3>
      <p className="mb-2 text-xs text-stone-500">Harga 0 = tanpa tambahan. Harga Jumbo hanya diisi untuk topping yang harganya ikut ukuran (topping ropang).</p>
      <div className="mb-1 grid grid-cols-[1fr_68px_68px_44px] gap-1.5 sm:grid-cols-[1fr_110px_110px_44px] sm:gap-2 text-xs font-semibold text-stone-500">
        <span>Nama</span>
        <span>Harga</span>
        <span><span className="sm:hidden">Jumbo</span><span className="hidden sm:inline">Harga Jumbo</span></span>
        <span />
      </div>
      {opts.map((o, i) => (
        <div key={i} className="mb-2 grid grid-cols-[1fr_68px_68px_44px] gap-1.5 sm:grid-cols-[1fr_110px_110px_44px] sm:gap-2">
          <Input value={o.name} onChange={(e) => upd(i, "name", e.target.value)} />
          <Input value={o.price} inputMode="numeric" onChange={(e) => upd(i, "price", e.target.value.replace(/\D/g, ""))} />
          <Input value={o.priceJumbo} inputMode="numeric" placeholder="-" onChange={(e) => upd(i, "priceJumbo", e.target.value.replace(/\D/g, ""))} />
          <Button variant="ghost" size="icon" disabled={opts.length === 1} onClick={() => setOpts((x) => x.filter((_, j) => j !== i))} aria-label="Hapus pilihan">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setOpts((x) => [...x, { name: "", price: "0", priceJumbo: "" }])}>
        <Plus className="h-4 w-4" /> Pilihan
      </Button>
    </Dialog>
  );
}
