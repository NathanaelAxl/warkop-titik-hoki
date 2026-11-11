import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi");
  // prepare: false wajib untuk pooler Supabase mode transaction
  const max = Number(process.env.DB_POOL_MAX) || 5;
  return postgres(url, { prepare: false, max, idle_timeout: 20 });
}

const client = globalThis.__pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.__pgClient = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };
