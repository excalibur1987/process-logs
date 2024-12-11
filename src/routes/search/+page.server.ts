import { db } from "$lib/db";
import { functionProgress, functionHeaders } from "$lib/db/schema";
import { format } from "date-fns";
import { and, between, ilike, sql, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  // Set default date range to last 7 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const defaultStartDate = format(start, "yyyy-MM-dd");
  const defaultEndDate = format(end, "yyyy-MM-dd");

  const results = await db
    .select({
      funcId: functionProgress.funcId,
      parentId: functionProgress.parentId,
      slug: functionProgress.slug,
      startDate: functionProgress.startDate,
      endDate: functionProgress.endDate,
      finished: functionProgress.finished,
      success: functionProgress.success,
      source: functionProgress.source,
      args: functionProgress.args,
      funcHeaderId: functionProgress.funcHeaderId,
      funcName: functionHeaders.funcName,
      funcSlug: functionHeaders.funcSlug,
    })
    .from(functionProgress)
    .innerJoin(
      functionHeaders,
      eq(functionProgress.funcHeaderId, functionHeaders.id)
    )
    .where(
      between(
        functionProgress.startDate,
        new Date(defaultStartDate).toISOString(),
        new Date(defaultEndDate).toISOString()
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

    const filters = [ilike(functionProgress.slug, `%${funcName}%`)];

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
      .select({
        funcId: functionProgress.funcId,
        parentId: functionProgress.parentId,
        slug: functionProgress.slug,
        startDate: functionProgress.startDate,
        endDate: functionProgress.endDate,
        finished: functionProgress.finished,
        success: functionProgress.success,
        source: functionProgress.source,
        args: functionProgress.args,
        funcHeaderId: functionProgress.funcHeaderId,
        funcName: functionHeaders.funcName,
        funcSlug: functionHeaders.funcSlug,
      })
      .from(functionProgress)
      .innerJoin(
        functionHeaders,
        eq(functionProgress.funcHeaderId, functionHeaders.id)
      )
      .where(and(...filters));

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
