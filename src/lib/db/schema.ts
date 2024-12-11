import {
  pgTable,
  foreignKey,
  serial,
  timestamp,
  integer,
  varchar,
  text,
  boolean,
  json,
} from "drizzle-orm/pg-core";

export const functionLogs = pgTable(
  "function_logs",
  {
    id: serial().primaryKey().notNull(),
    rowDate: timestamp("row_date", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    funcId: integer("func_id").notNull(),
    type: varchar({ length: 10 }).notNull(),
    message: text().notNull(),
    traceBack: text("trace_back"),
  },
  (table) => [
    foreignKey({
      columns: [table.funcId],
      foreignColumns: [functionProgress.funcId],
      name: "fk_function_logs_func_id_function_progress",
    }),
  ]
);

export const functionProgress = pgTable(
  "function_progress",
  {
    funcId: serial("func_id").primaryKey().notNull(),
    parentId: integer("parent_id"),
    funcSlug: varchar("func_slug", { length: 200 }),
    funcName: varchar("func_name", { length: 200 }).notNull(),
    startDate: timestamp("start_date", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true, mode: "string" }),
    finished: boolean().notNull(),
    success: boolean().notNull(),
    source: varchar({ length: 20 }).notNull().default(""),
    args: json(),
    funcHeaderId: integer("func_header_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.funcId],
      name: "fk_function_progress_parent_id_function_progress",
    }),
    foreignKey({
      columns: [table.funcHeaderId],
      foreignColumns: [functionHeaders.id],
      name: "function_progress_function_headers_fk",
    }),
  ]
);

export const functionHeaders = pgTable("function_headers", {
  id: serial().primaryKey().notNull(),
  funcName: varchar("func_name", { length: 200 }).notNull(),
  funcSlug: text("func_slug").notNull(),
});
