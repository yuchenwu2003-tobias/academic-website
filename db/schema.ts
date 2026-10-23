import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cloudRecords = sqliteTable("cloud_records", {
  userId: text("user_id").notNull(),
  collection: text("collection").notNull(),
  recordId: text("record_id").notNull(),
  value: text("value").notNull(),
  deleted: integer("deleted").notNull().default(0),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.collection, table.recordId] })]);

export const cloudMutations = sqliteTable("cloud_mutations", {
  userId: text("user_id").notNull(),
  requestId: text("request_id").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.requestId] })]);
