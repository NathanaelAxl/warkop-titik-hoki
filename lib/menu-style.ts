// Ikon & warna untuk kategori/menu, ditebak dari namanya.
// Menu baru yang ditambah owner otomatis ikut dapat ikon yang cocok (atau ikon default).

export type Tone = {
  /** latar kartu menu */
  card: string;
  /** lingkaran ikon */
  bubble: string;
  /** warna harga */
  price: string;
  /** chip kategori aktif */
  chip: string;
};

// Kelas ditulis lengkap supaya terbaca oleh Tailwind
const TONES = {
  orange: { card: "from-orange-50", bubble: "bg-orange-100 ring-orange-200", price: "text-orange-700", chip: "bg-orange-500" },
  amber: { card: "from-amber-50", bubble: "bg-amber-100 ring-amber-200", price: "text-amber-700", chip: "bg-amber-500" },
  yellow: { card: "from-yellow-50", bubble: "bg-yellow-100 ring-yellow-200", price: "text-yellow-700", chip: "bg-yellow-500" },
  lime: { card: "from-lime-50", bubble: "bg-lime-100 ring-lime-200", price: "text-lime-700", chip: "bg-lime-600" },
  rose: { card: "from-rose-50", bubble: "bg-rose-100 ring-rose-200", price: "text-rose-700", chip: "bg-rose-500" },
  coffee: { card: "from-stone-100", bubble: "bg-stone-200 ring-stone-300", price: "text-espresso-700", chip: "bg-espresso-700" },
  sky: { card: "from-sky-50", bubble: "bg-sky-100 ring-sky-200", price: "text-sky-700", chip: "bg-sky-500" },
  teal: { card: "from-teal-50", bubble: "bg-teal-100 ring-teal-200", price: "text-teal-700", chip: "bg-teal-600" },
  default: { card: "from-cream-50", bubble: "bg-cream-100 ring-cream-300", price: "text-brand-700", chip: "bg-brand-600" },
} satisfies Record<string, Tone>;

const CATEGORY_RULES: [RegExp, string, keyof typeof TONES][] = [
  [/signature|spesial|special/i, "⭐", "rose"],
  [/indomie|bihun|mie|mi\b/i, "🍜", "amber"],
  [/ropang|roti/i, "🍞", "yellow"],
  [/pisang/i, "🍌", "lime"],
  [/kopi|coffee/i, "☕", "coffee"],
  [/soft|soda|drink/i, "🥤", "sky"],
  [/minum|teh|susu|jus|es\b/i, "🧋", "teal"],
  [/snack|cemil|gorengan/i, "🍟", "orange"],
];

const PRODUCT_RULES: [RegExp, string][] = [
  [/martabak/i, "🥙"],
  [/kentang/i, "🍟"],
  [/telur/i, "🍳"],
  [/indomie|mie|bihun/i, "🍜"],
  [/ropang|roti/i, "🍞"],
  [/pisang/i, "🍌"],
  [/extra joss|kuku bima|energi/i, "⚡"],
  [/fanta|soda|sprite|cola/i, "🥤"],
  [/dancow|susu/i, "🥛"],
  [/good ?day|kopi|coffee|cappu/i, "☕"],
  [/teh|tea/i, "🍵"],
  [/jeruk|lemon/i, "🍋"],
  [/es\b|ice/i, "🧊"],
];

export function categoryStyle(name: string): { emoji: string; tone: Tone } {
  for (const [re, emoji, tone] of CATEGORY_RULES) if (re.test(name)) return { emoji, tone: TONES[tone] };
  return { emoji: "🍽️", tone: TONES.default };
}

export function productEmoji(name: string, categoryName?: string): string {
  for (const [re, emoji] of PRODUCT_RULES) if (re.test(name)) return emoji;
  return categoryName ? categoryStyle(categoryName).emoji : "🍽️";
}
