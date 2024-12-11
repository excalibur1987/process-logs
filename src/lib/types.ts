import type { functionProgress, functionHeaders } from "./db/schema";

export type FunctionProgress = typeof functionProgress.$inferSelect;
export type FunctionHeader = typeof functionHeaders.$inferSelect;
