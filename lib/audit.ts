import "server-only";
import { db, schema, type Tx } from "./db";

export async function audit(
  userId: number,
  action: string,
  detail?: Record<string, unknown>,
  tx?: Tx,
) {
  await (tx ?? db).insert(schema.auditLogs).values({ userId, action, detail: detail ?? null });
}
