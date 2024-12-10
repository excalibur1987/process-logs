import {
  integer,
  serial,
  varchar,
  timestamp,
  boolean,
  pgTable,
  foreignKey,
} from "drizzle-orm/pg-core";

export const functionHeaders = pgTable("function_headers", {
  id: serial("id").primaryKey(),
  funcName: varchar("func_name", { length: 200 }).notNull(),
});

export const functionProgress = pgTable(
  "function_progress",
  {
    funcId: serial("func_id").primaryKey(),
    parentId: integer("parent_id"),
    funcSlug: varchar("func_slug", { length: 200 }),
    funcName: varchar("func_name", { length: 200 }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    finished: boolean("finished").notNull(),
    success: boolean("success").notNull(),
    args: varchar("args", { length: 1600 }),
    source: varchar("source", { length: 20 }).notNull(),
  },
  (table) => {
    return {
      parentReference: foreignKey({
        columns: [table.parentId],
        foreignColumns: [table.funcId],
        name: "function_progress_parent_id_fkey",
      }),
    };
  }
);

export const functionLogs = pgTable("function_logs", {
  id: serial("id").primaryKey(),
  rowDate: timestamp("row_date", { withTimezone: true }).notNull(),
  funcId: integer("func_id")
    .notNull()
    .references(() => functionProgress.funcId),
  type: varchar("type", { length: 10 }).notNull(),
  message: varchar("message").notNull(),
  traceBack: varchar("trace_back"),
});
