/**
 * Isi data awal: menu (sesuai PRD), pengaturan toko, akun owner & pegawai.
 * Aman dijalankan berulang: menu hanya diisi kalau tabel kategori masih kosong,
 * akun hanya dibuat kalau belum ada pengguna sama sekali.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as s from "../lib/db/schema";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL belum diisi di .env");
const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema: s });

type Opt = string | [name: string, price: number] | [name: string, price: number, priceJumbo: number];
type GroupDef = { name: string; required: boolean; max: number | null; options: Opt[] };

const GROUPS: Record<string, GroupDef> = {
  rasaIndomie: {
    name: "Rasa Indomie", required: true, max: 1,
    options: ["Aceh", "Soto Ayam", "Kari Ayam", "Ayam Bawang", "Rendang", "Goreng", "Goreng Rendang", "Cabe Ijo"],
  },
  toppingIndomie: {
    name: "Topping Indomie", required: false, max: null,
    options: [["Telur", 5000], ["Tictac/Sukro", 2000], ["Kuaci", 2000]],
  },
  toppingRopang: {
    name: "Topping Ropang", required: false, max: null,
    options: [
      ["Cokelat", 3000, 6000], ["Keju", 5000, 10000], ["Cokelat Keju", 8000, 16000],
      ["Strawberry", 4000, 8000], ["Blueberry", 4000, 8000], ["Peanut Butter", 6000, 12000],
      ["Choco Crunchy", 6000, 12000], ["Telur + Kornet", 10000, 20000],
    ],
  },
  merekKopi: {
    name: "Merek Kopi", required: true, max: 1,
    options: ["Indocafe", "ABC Susu", "Kapal Api Mix", "Luwak White Koffie", "Nescafe Classic", "Kopi Gajah"],
  },
  rasaGoodDay: { name: "Rasa Good Day", required: true, max: 1, options: ["Cappuccino", "Chococinno", "Mocacinno"] },
  rasaDancow: { name: "Rasa Dancow", required: true, max: 1, options: ["Cokelat", "Vanilla"] },
  rasaTeajus: { name: "Rasa Teajus", required: true, max: 1, options: ["Apel", "Madu", "Melati", "Lemon", "Gula Batu"] },
  rasaNutrisari: {
    name: "Rasa Nutrisari", required: true, max: 1,
    options: ["Lychee", "Sirsak", "Blewah", "Anggur", "Markisa", "Jeruk Nipis/Peras", "Sweet Mango", "Milky Orange", "Sweet Orange"],
  },
  rasaPopIce: {
    name: "Rasa Pop Ice", required: true, max: 1,
    options: ["Grape", "Durian", "Lychee", "Cokelat", "Strawberry", "Bubble Gum", "Choco Cookies"],
  },
  rasaSusu: { name: "Rasa Susu", required: true, max: 1, options: ["Milo", "Ovaltine", "Bengbeng", "Susu Jahe", "Energen", "Frisian Flag"] },
  rasaTeh: { name: "Rasa Teh", required: true, max: 1, options: ["Bonteh Matcha", "Teh Tarik", "Teh Tjap Solo", "Es Teh Matcha"] },
  suhu: { name: "Suhu", required: true, max: 1, options: ["Panas", "Dingin"] },
  fantaSoda: { name: "Pilihan Fanta/Soda", required: true, max: 1, options: ["Fanta Susu", "Soda Susu"] },
  ejKb: { name: "Pilihan Extra Joss/Kuku Bima", required: true, max: 1, options: ["Extra Joss", "Kuku Bima"] },
};
type G = keyof typeof GROUPS;

type ProductDef = { name: string; price: number | [normal: number, jumbo: number]; groups?: G[] };

const MENU: { category: string; products: ProductDef[] }[] = [
  {
    category: "Indomie - Bihun",
    products: [
      { name: "Indomie Single", price: 10000, groups: ["rasaIndomie", "toppingIndomie"] },
      { name: "Indomie Double", price: 15000, groups: ["rasaIndomie", "toppingIndomie"] },
      { name: "Indomie Jumbo Single", price: 12000, groups: ["rasaIndomie", "toppingIndomie"] },
      { name: "Indomie Jumbo Double", price: 17000, groups: ["rasaIndomie", "toppingIndomie"] },
      { name: "Super Bihun", price: 12000, groups: ["rasaIndomie", "toppingIndomie"] },
    ],
  },
  {
    category: "Snack",
    products: [
      { name: "Martabak Mie", price: 17000 },
      { name: "Martabak Mie Kornet", price: 20000 },
      { name: "Kentang Goreng", price: 15000 },
    ],
  },
  {
    category: "Ropang Manis & Asin",
    products: [
      { name: "Ropang Polos", price: [10000, 18000], groups: ["toppingRopang"] },
      { name: "Ropang Gula", price: [10000, 18000], groups: ["toppingRopang"] },
    ],
  },
  {
    category: "Signature Titik Hoki",
    products: [
      { name: "Mie Tabrak", price: 17000 },
      { name: "Telur 1/2 Matang", price: 15000 },
      { name: "Telur Pecah Keju", price: 15000 },
    ],
  },
  {
    category: "Pisang Bakar",
    products: [
      { name: "Pisang Bakar Polos", price: 10000 },
      { name: "Pisang Bakar Cokelat", price: 13000 },
      { name: "Pisang Bakar Keju", price: 15000 },
      { name: "Pisang Bakar Cokelat Keju", price: 18000 },
      { name: "Pisang Bakar Cokelat Susu", price: 15000 },
      { name: "Pisang Bakar Keju Susu", price: 17000 },
    ],
  },
  {
    category: "Kopi",
    products: [
      { name: "Kopi Sachet", price: 5000, groups: ["merekKopi", "suhu"] },
      { name: "Good Day", price: 7000, groups: ["rasaGoodDay", "suhu"] },
      { name: "Dancow", price: 8000, groups: ["rasaDancow", "suhu"] },
    ],
  },
  {
    category: "Soft Drinks",
    products: [
      { name: "Fanta Susu / Soda Susu", price: 15000, groups: ["fantaSoda"] },
      { name: "Extra Joss / Kuku Bima", price: 6000, groups: ["ejKb"] },
      { name: "Extra Joss / Kuku Bima Susu", price: 8000, groups: ["ejKb"] },
    ],
  },
  {
    category: "Minuman",
    products: [
      { name: "Teajus", price: 4000, groups: ["rasaTeajus", "suhu"] },
      { name: "Nutrisari", price: 5000, groups: ["rasaNutrisari", "suhu"] },
      { name: "Pop Ice", price: 7000, groups: ["rasaPopIce"] },
      { name: "Susu", price: 7000, groups: ["rasaSusu", "suhu"] },
      { name: "Teh", price: 7000, groups: ["rasaTeh", "suhu"] },
      { name: "Lemon Tea", price: 10000, groups: ["suhu"] },
    ],
  },
];

async function seedMenu() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.categories);
  if (n > 0) {
    console.log("• Menu sudah ada, dilewati");
    return;
  }
  await db.transaction(async (tx) => {
    const groupIds = {} as Record<G, number>;
    for (const [key, g] of Object.entries(GROUPS) as [G, GroupDef][]) {
      const [row] = await tx
        .insert(s.optionGroups)
        .values({ name: g.name, isRequired: g.required, minSelect: g.required ? 1 : 0, maxSelect: g.max })
        .returning({ id: s.optionGroups.id });
      groupIds[key] = row.id;
      await tx.insert(s.options).values(
        g.options.map((o, i) => {
          const [name, price = 0, priceJumbo = null] = typeof o === "string" ? [o] : o;
          return { groupId: row.id, name, price, priceJumbo, sortOrder: i };
        }),
      );
    }

    for (const [ci, cat] of MENU.entries()) {
      const [c] = await tx.insert(s.categories).values({ name: cat.category, sortOrder: ci + 1 }).returning({ id: s.categories.id });
      for (const [pi, p] of cat.products.entries()) {
        const [prod] = await tx
          .insert(s.products)
          .values({ categoryId: c.id, name: p.name, sortOrder: pi + 1 })
          .returning({ id: s.products.id });
        const variants = Array.isArray(p.price)
          ? [{ name: "Normal", price: p.price[0] }, { name: "Jumbo", price: p.price[1] }]
          : [{ name: "Standar", price: p.price }];
        await tx.insert(s.productVariants).values(variants.map((v, i) => ({ ...v, productId: prod.id, sortOrder: i })));
        if (p.groups?.length)
          await tx
            .insert(s.productOptionGroups)
            .values(p.groups.map((g, i) => ({ productId: prod.id, optionGroupId: groupIds[g], sortOrder: i })));
      }
    }
  });
  console.log(`• Menu diisi: ${MENU.length} kategori, ${MENU.reduce((a, c) => a + c.products.length, 0)} menu`);
}

async function seedUsers() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users);
  if (n > 0) {
    console.log("• Pengguna sudah ada, dilewati");
    return;
  }
  const ownerName = process.env.SEED_OWNER_NAME || "Owner";
  const ownerPin = process.env.SEED_OWNER_PIN || "123456";
  const staffName = process.env.SEED_PEGAWAI_NAME || "Budi";
  const staffPin = process.env.SEED_PEGAWAI_PIN || "1234";
  for (const pin of [ownerPin, staffPin]) if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN seed harus 4-6 digit");
  await db.insert(s.users).values([
    { name: ownerName, role: "owner", pinHash: await bcrypt.hash(ownerPin, 10) },
    { name: staffName, role: "pegawai", pinHash: await bcrypt.hash(staffPin, 10) },
  ]);
  console.log(`• Akun dibuat: ${ownerName} (owner, PIN ${ownerPin}), ${staffName} (pegawai, PIN ${staffPin})`);
  console.log("  Segera ganti PIN default lewat menu Pegawai!");
}

async function seedSettings() {
  const defaults = {
    store_name: "WARKOP TITIK HOKI",
    store_address: "Gading Serpong, Sektor 1A",
    store_hours: "Buka 17:30 - 01:00",
    receipt_footer: "Terima kasih, sampai jumpa!",
    day_cutoff: "06:00",
  };
  for (const [key, value] of Object.entries(defaults))
    await db.insert(s.settings).values({ key, value }).onConflictDoNothing();
  console.log("• Pengaturan toko default siap");
}

async function main() {
  await seedSettings();
  await seedUsers();
  await seedMenu();
  console.log("Seed selesai ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
