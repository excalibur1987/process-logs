import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import {
  functionProgress,
  functionLogs,
  functionHeaders,
} from "$lib/db/schema";
import { eq, and, between, or, sql, ilike, isNull } from "drizzle-orm";

import { z } from "zod";

export async function POST({ request }) {
  const data = await request.json();

  const schema = z.object({
    funcName: z.string(),
    parentId: z.number(),
    slug: z.string(),
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

  const { funcName, parentId, slug, args, source, logs = [] } = parsedData.data;

  const funcHeaderId = await db
    .select({ id: functionHeaders.id })
    .from(functionHeaders)
    .where(eq(functionHeaders.funcSlug, funcName))
    .then(([result]) => result?.id);

  const [progress] = await db
    .insert(functionProgress)
    .values({
      funcHeaderId,
      parentId,
      slug,
      args: JSON.stringify(args),
      source,
      startDate: new Date().toISOString(),
      finished: false,
      success: false,
    })
    .returning();

  if (logs.length > 0) {
    await db.insert(functionLogs).values(
      logs.map((log) => ({
        funcId: progress.funcId,
        rowDate: new Date().toISOString(),
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
  const slug = url.searchParams.get("slug");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const isParent = url.searchParams.get("isParent");

  const filters = [
    or(
      ilike(functionHeaders.funcName, `${funcName ? `%${funcName}%` : ""}`),
      ilike(functionProgress.slug, `${slug ? `%${slug}%` : ""}`),
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

  const results = await query;

  const summary = {
    total: results.length,
    running: results.filter((r) => !r.finished).length,
    succeeded: results.filter((r) => r.finished && r.success).length,
    failed: results.filter((r) => r.finished && !r.success).length,
  };

  return json({ summary, results });
}
