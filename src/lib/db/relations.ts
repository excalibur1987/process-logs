import { relations } from "drizzle-orm/relations";
import { functionProgress, functionLogs, functionHeaders } from "./schema";

export const functionLogsRelations = relations(functionLogs, ({ one }) => ({
  functionProgress: one(functionProgress, {
    fields: [functionLogs.funcId],
    references: [functionProgress.funcId],
  }),
}));

export const functionProgressRelations = relations(
  functionProgress,
  ({ one, many }) => ({
    functionLogs: many(functionLogs),
    functionProgress: one(functionProgress, {
      fields: [functionProgress.parentId],
      references: [functionProgress.funcId],
      relationName: "functionProgress_parentId_functionProgress_funcId",
    }),
    functionProgresses: many(functionProgress, {
      relationName: "functionProgress_parentId_functionProgress_funcId",
    }),
    functionHeader: one(functionHeaders, {
      fields: [functionProgress.funcHeaderId],
      references: [functionHeaders.id],
    }),
  })
);

export const functionHeadersRelations = relations(
  functionHeaders,
  ({ many }) => ({
    functionProgresses: many(functionProgress),
  })
);
