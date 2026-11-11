import {
  pgTable,
  integer,
  text,
  boolean,
  bigint,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

// Semua uang disimpan sebagai bilangan bulat rupiah (BIGINT), dibaca sebagai number JS.
const money = (name: string) => bigint(name, { mode: "number" });

export const roleEnum = pgEnum("user_role", ["owner", "pegawai"]);
export const orderStatusEnum = pgEnum("order_status", ["open", "paid", "void"]);
export const payMethodEnum = pgEnum("pay_method", ["cash", "qris"]);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("pegawai"),
  pinHash: text("pin_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
}).enableRLS();

export const products = pgTable(
  "products",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("products_category_idx").on(t.categoryId)],
).enableRLS();

export const productVariants = pgTable(
  "product_variants",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: money("price").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
).enableRLS();

export const optionGroups = pgTable("option_groups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  minSelect: integer("min_select").notNull().default(0),
  // null = tidak dibatasi
  maxSelect: integer("max_select"),
}).enableRLS();

export const options = pgTable(
  "options",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    groupId: integer("group_id")
      .notNull()
      .references(() => optionGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: money("price").notNull().default(0),
    // Hanya untuk topping ropang: harga saat varian produk = "Jumbo"
    priceJumbo: money("price_jumbo"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("options_group_idx").on(t.groupId)],
).enableRLS();

export const productOptionGroups = pgTable(
  "product_option_groups",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    optionGroupId: integer("option_group_id")
      .notNull()
      .references(() => optionGroups.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.optionGroupId] })],
).enableRLS();

export const orders = pgTable(
  "orders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull(),
    tableLabel: text("table_label"),
    customerName: text("customer_name"),
    status: orderStatusEnum("status").notNull().default("open"),
    subtotal: money("subtotal").notNull().default(0),
    total: money("total").notNull().default(0),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    businessDate: date("business_date", { mode: "string" }).notNull(),
  },
  (t) => [
    uniqueIndex("orders_code_uq").on(t.code),
    index("orders_status_idx").on(t.status),
    index("orders_business_date_idx").on(t.businessDate),
  ],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id"), // referensi lunak, tidak wajib ada lagi
    productName: text("product_name").notNull(),
    variantName: text("variant_name").notNull(),
    unitPrice: money("unit_price").notNull(),
    qty: integer("qty").notNull(),
    note: text("note"),
    lineTotal: money("line_total").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
).enableRLS();

export const orderItemOptions = pgTable(
  "order_item_options",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderItemId: integer("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    optionId: integer("option_id"), // referensi lunak untuk menggabung item yang sama
    groupName: text("group_name").notNull(),
    optionName: text("option_name").notNull(),
    price: money("price").notNull(),
  },
  (t) => [index("order_item_options_item_idx").on(t.orderItemId)],
).enableRLS();

export const payments = pgTable(
  "payments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    method: payMethodEnum("method").notNull(),
    amountDue: money("amount_due").notNull(),
    amountReceived: money("amount_received").notNull(),
    changeAmount: money("change_amount").notNull(),
    receivedBy: integer("received_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payments_order_uq").on(t.orderId)],
).enableRLS();

export const voids = pgTable(
  "voids",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    reason: text("reason").notNull(),
    wasPaid: boolean("was_paid").notNull().default(false),
    voidedBy: integer("voided_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("voids_order_uq").on(t.orderId)],
).enableRLS();

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
}).enableRLS();

// Jejak audit: siapa melakukan apa dan kapan (bayar, batal, ubah harga, dll.)
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id").references(() => users.id),
    action: text("action").notNull(),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
).enableRLS();
