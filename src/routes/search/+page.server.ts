import { db } from "$lib/db";
import { functionProgress, functionHeaders } from "$lib/db/schema";
import { format } from "date-fns";
import { and, between, ilike, sql, eq, desc } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  // Set default date range to last 7 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const defaultStartDate = format(start, "yyyy-MM-dd");
  const defaultEndDate = format(end, "yyyy-MM-dd");

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // Get total count
  const totalCount = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
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
    )
    .then(([{ count }]) => Number(count));

  // Get paginated results
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
    )
    .orderBy(desc(functionProgress.startDate))
    .limit(limit)
    .offset(offset);

  return {
    results,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
    defaultDates: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
  };
};

export const actions = {
  search: async ({ request, url }) => {
    const formData = await request.formData();
    const funcName = formData.get("funcName")?.toString() || "";
    const startDate = formData.get("startDate")?.toString();
    const endDate = formData.get("endDate")?.toString();
    const status = formData.get("status")?.toString() || "all";
    const page = parseInt(formData.get("page")?.toString() || "1");
    const limit = parseInt(formData.get("limit")?.toString() || "10");
    const offset = (page - 1) * limit;

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

    // Get total count
    const totalCount = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(functionProgress)
      .innerJoin(
        functionHeaders,
        eq(functionProgress.funcHeaderId, functionHeaders.id)
      )
      .where(and(...filters))
      .then(([{ count }]) => Number(count));

    // Get paginated results
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
      .where(and(...filters))
      .orderBy(desc(functionProgress.startDate))
      .limit(limit)
      .offset(offset);

    // Filter by status on the server side
    const filteredResults =
      status !== "all"
        ? results.filter((func) => {
            if (status === "running") return !func.finished;
            if (status === "success") return func.finished && func.success;
            if (status === "failed") return func.finished && !func.success;
            return true;
          })
        : results;

    return {
      results: filteredResults,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    };
  },
} satisfies Actions;
