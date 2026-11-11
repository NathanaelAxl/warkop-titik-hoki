import "server-only";
import { asc, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import type { MenuCategory, MenuOptionGroup, MenuProduct } from "./types";

/** Ambil seluruh menu. activeOnly=true untuk layar kasir. */
export async function loadMenu(activeOnly: boolean): Promise<MenuCategory[]> {
  const [cats, prods, vars, groups, opts, links] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.id)),
    db.select().from(schema.products).orderBy(asc(schema.products.sortOrder), asc(schema.products.id)),
    db.select().from(schema.productVariants).orderBy(asc(schema.productVariants.sortOrder), asc(schema.productVariants.id)),
    db.select().from(schema.optionGroups),
    db.select().from(schema.options).orderBy(asc(schema.options.sortOrder), asc(schema.options.id)),
    db.select().from(schema.productOptionGroups).orderBy(asc(schema.productOptionGroups.sortOrder)),
  ]);

  const groupMap = new Map<number, MenuOptionGroup>();
  for (const g of groups)
    groupMap.set(g.id, { id: g.id, name: g.name, isRequired: g.isRequired, minSelect: g.minSelect, maxSelect: g.maxSelect, options: [] });
  for (const o of opts)
    groupMap.get(o.groupId)?.options.push({ id: o.id, name: o.name, price: o.price, priceJumbo: o.priceJumbo });

  const prodMap = new Map<number, MenuProduct>();
  for (const p of prods) {
    if (activeOnly && !p.isActive) continue;
    prodMap.set(p.id, { id: p.id, categoryId: p.categoryId, name: p.name, isActive: p.isActive, sortOrder: p.sortOrder, variants: [], optionGroups: [] });
  }
  for (const v of vars) prodMap.get(v.productId)?.variants.push({ id: v.id, name: v.name, price: v.price });
  for (const l of links) {
    const g = groupMap.get(l.optionGroupId);
    if (g) prodMap.get(l.productId)?.optionGroups.push(g);
  }

  const out: MenuCategory[] = [];
  for (const c of cats) {
    if (activeOnly && !c.isActive) continue;
    const products = [...prodMap.values()].filter((p) => p.categoryId === c.id && (!activeOnly || p.variants.length > 0));
    if (activeOnly && products.length === 0) continue;
    out.push({ id: c.id, name: c.name, isActive: c.isActive, sortOrder: c.sortOrder, products });
  }
  return out;
}

export async function loadOptionGroupsWithOptions() {
  const groups = await db.select().from(schema.optionGroups).orderBy(asc(schema.optionGroups.name));
  const ids = groups.map((g) => g.id);
  const opts = ids.length
    ? await db.select().from(schema.options).where(inArray(schema.options.groupId, ids)).orderBy(asc(schema.options.sortOrder), asc(schema.options.id))
    : [];
  return groups.map((g) => ({ ...g, options: opts.filter((o) => o.groupId === g.id) }));
}
