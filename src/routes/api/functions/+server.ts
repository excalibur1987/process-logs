import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { functionProgress, functionLogs } from "$lib/db/schema";
import { eq, and, between, or, sql, ilike, isNull } from "drizzle-orm";

import { z } from "zod";

export async function POST({ request }) {
  const data = await request.json();

  const schema = z.object({
    funcName: z.string(),
    parentId: z.number(),
    funcSlug: z.string(),
    args: z.any(),
    source: z.string(),
    logs: z.array(
      z.object({
        type: z.string(),
        message: z.string(),
        traceBack: z.string(),
      })
    ),
  });

  const parsedData = schema.safeParse(data);
  if (!parsedData.success) {
    throw new Error("Invalid data format");
  }

  const {
    funcName,
    parentId,
    funcSlug,
    args,
    source,
    logs = [],
  } = parsedData.data;

  const [progress] = await db
    .insert(functionProgress)
    .values({
      funcName,
      parentId,
      funcSlug,
      args: JSON.stringify(args),
      source,
      startDate: new Date(),
      finished: false,
      success: false,
    })
    .returning();

  if (logs.length > 0) {
    await db.insert(functionLogs).values(
      logs.map((log) => ({
        funcId: progress.funcId,
        rowDate: new Date(),
        type: log.type,
        message: log.message,
        traceBack: log.traceBack,
      }))
    );
  }

  return json({ funcId: progress.funcId });
}

export async function GET({ url }) {
  const funcName = url.searchParams.get("funcName");
  const funcSlug = url.searchParams.get("funcSlug");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const isParent = url.searchParams.get("isParent");

  const filters = [
    or(
      ilike(functionProgress.funcName, `${funcName ? `%${funcName}%` : ""}`),
      ilike(functionProgress.funcSlug, `${funcSlug ? `%${funcSlug}%` : ""}`),
      eq(sql<string>`${funcName || ""}`, sql`''`)
    ),
  ];
  if (startDate && endDate) {
    filters.push(
      between(
        sql<Date>`${functionProgress.startDate}::date`,
        new Date(startDate),
        new Date(endDate)
      )
    );
  }

  if (isParent) {
    filters.push(isNull(functionProgress.parentId));
  }

  let query = db
    .select()
    .from(functionProgress)
    .where(and(...filters));

  const results = await query.execute();

  const summary = {
    total: results.length,
    running: results.filter((r) => !r.finished).length,
    succeeded: results.filter((r) => r.finished && r.success).length,
    failed: results.filter((r) => r.finished && !r.success).length,
  };

  return json({ summary, results });
}
