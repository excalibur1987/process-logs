import { db } from "$lib/db";
import { functionProgress } from "$lib/db/schema";
import { eq, and, between, or, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const results = await db.select().from(functionProgress);

  const summary = {
    total: results.length,
    running: results.filter((r) => !r.finished).length,
    succeeded: results.filter((r) => r.finished && r.success).length,
    failed: results.filter((r) => r.finished && !r.success).length,
    results: results.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    ),
  };

  return { summary };
};
