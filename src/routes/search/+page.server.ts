import { db } from "$lib/db";
import { functionProgress } from "$lib/db/schema";
import { eq, and, between, or, sql, ilike } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { format } from "date-fns";

export const load: PageServerLoad = async () => {
  // Set default date range to last 7 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const defaultStartDate = format(start, "yyyy-MM-dd");
  const defaultEndDate = format(end, "yyyy-MM-dd");

  const results = await db
    .select()
    .from(functionProgress)
    .where(
      between(
        functionProgress.startDate,
        new Date(defaultStartDate),
        new Date(defaultEndDate)
      )
    );

  return {
    results,
    defaultDates: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
  };
};

export const actions = {
  search: async ({ request }) => {
    const formData = await request.formData();
    const funcName = formData.get("funcName")?.toString() || "";
    const startDate = formData.get("startDate")?.toString();
    const endDate = formData.get("endDate")?.toString();
    const status = formData.get("status")?.toString() || "all";

    const filters = [ilike(functionProgress.funcName, `%${funcName}%`)];

    if (startDate && endDate) {
      filters.push(
        between(
          sql<Date>`${functionProgress.startDate}::date`,
          new Date(startDate),
          new Date(endDate)
        )
      );
    }

    let query = db
      .select()
      .from(functionProgress)
      .where(and(...filters));

    console.log(
      "🚀 ~ file: +page.server.ts:57 ~ search: ~ query:",
      query.toSQL()
    );

    let results = await query;

    // Filter by status on the server side
    if (status !== "all") {
      results = results.filter((func) => {
        if (status === "running") return !func.finished;
        if (status === "success") return func.finished && func.success;
        if (status === "failed") return func.finished && !func.success;
        return true;
      });
    }

    return { results };
  },
} satisfies Actions;
