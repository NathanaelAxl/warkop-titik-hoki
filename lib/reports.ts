import "server-only";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./api";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "format tanggal YYYY-MM-DD");

export function parseRange(url: string) {
  const sp = new URL(url).searchParams;
  const from = dateStr.parse(sp.get("from"));
  const to = dateStr.parse(sp.get("to") ?? from);
  if (from > to) throw new HttpError(400, "Tanggal awal harus sebelum tanggal akhir");
  return { from, to, sp };
}

export type DailyRow = {
  date: string;
  omzet: number;
  trxCount: number;
  cash: number;
  qris: number;
  voidCount: number;
};

export async function dailyReport(from: string, to: string): Promise<DailyRow[]> {
  const { rows } = await db.execute<Record<string, string | number>>(sql`
    select o.business_date::text as date,
      coalesce(sum(o.total) filter (where o.status = 'paid'), 0)::bigint as omzet,
      (count(*) filter (where o.status = 'paid'))::int as trx_count,
      coalesce(sum(p.amount_due) filter (where o.status = 'paid' and p.method = 'cash'), 0)::bigint as cash,
      coalesce(sum(p.amount_due) filter (where o.status = 'paid' and p.method = 'qris'), 0)::bigint as qris,
      (count(*) filter (where o.status = 'void' and v.was_paid))::int as void_count
    from orders o
    left join payments p on p.order_id = o.id
    left join voids v on v.order_id = o.id
    where o.business_date between ${from} and ${to} and o.status in ('paid', 'void')
    group by o.business_date
    order by o.business_date desc
  `);
  return rows.map((r) => ({
    date: String(r.date),
    omzet: Number(r.omzet),
    trxCount: Number(r.trx_count),
    cash: Number(r.cash),
    qris: Number(r.qris),
    voidCount: Number(r.void_count),
  }));
}

export type TopItem = { name: string; qty: number; revenue: number };

export async function topItems(from: string, to: string, limit = 50): Promise<TopItem[]> {
  const { rows } = await db.execute<Record<string, string | number>>(sql`
    select case when oi.variant_name = 'Standar' then oi.product_name
                else oi.product_name || ' ' || oi.variant_name end as name,
      sum(oi.qty)::int as qty,
      sum(oi.line_total)::bigint as revenue
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.status = 'paid' and o.business_date between ${from} and ${to}
    group by 1
    order by qty desc, revenue desc
    limit ${limit}
  `);
  return rows.map((r) => ({ name: String(r.name), qty: Number(r.qty), revenue: Number(r.revenue) }));
}

export function toCsv(header: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  // BOM supaya Excel membaca UTF-8 dengan benar
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}
