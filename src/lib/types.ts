import type {
  functionProgress,
  functionHeaders,
  functionLogs,
} from "./db/schema";

export type FunctionProgress = typeof functionProgress.$inferSelect;
export type FunctionHeader = typeof functionHeaders.$inferSelect;
export type FunctionLog = typeof functionLogs.$inferSelect;
