import "server-only";
import { db, schema } from "./db";

export const SETTING_DEFAULTS = {
  store_name: "WARKOP TITIK HOKI",
  store_address: "Gading Serpong, Sektor 1A",
  store_hours: "Buka 17:30 - 01:00",
  receipt_footer: "Terima kasih, sampai jumpa!",
  day_cutoff: "06:00",
};
export type StoreSettings = typeof SETTING_DEFAULTS;
export type SettingKey = keyof StoreSettings;

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(schema.settings);
  const out = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}
