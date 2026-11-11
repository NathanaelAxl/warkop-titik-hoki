import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diisi");
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX) || 5,
    idleTimeoutMillis: 5_000,
    // Gagal dengan pesan error (bukan loading tanpa akhir) kalau DB tidak bisa dihubungi
    connectionTimeoutMillis: 10_000,
    query_timeout: 20_000,
  });
  // Koneksi yang putus di tengah jalan jangan sampai membuat server crash
  pool.on("error", (err) => console.error("[db] koneksi error:", err.message));
  // Di Vercel: tutup koneksi idle sebelum fungsi dibekukan, supaya request
  // berikutnya tidak memakai koneksi yang sudah mati. Di lokal tidak berpengaruh.
  attachDatabasePool(pool);
  return pool;
}

const pool = globalThis.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__pgPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };
