import { db } from "$lib/db";
import {
  functionProgress,
  functionLogs,
  functionHeaders,
} from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const funcId = parseInt(params.funcId);

  if (isNaN(funcId)) {
    throw error(400, "Invalid function ID");
  }

  try {
    // Get function details with header information
    const [func] = await db
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
        funcName: functionHeaders.funcName,
        headerSlug: functionHeaders.funcSlug,
      })
      .from(functionProgress)
      .innerJoin(
        functionHeaders,
        eq(functionProgress.funcHeaderId, functionHeaders.id)
      )
      .where(eq(functionProgress.funcId, funcId));

    if (!func) {
      throw error(404, "Function not found");
    }

    // Get function logs
    const logs = await db
      .select()
      .from(functionLogs)
      .where(eq(functionLogs.funcId, funcId))
      .orderBy(functionLogs.rowDate);

    // Get child functions if any
    const children = await db
      .select({
        funcId: functionProgress.funcId,
        slug: functionProgress.slug,
        startDate: functionProgress.startDate,
        endDate: functionProgress.endDate,
        finished: functionProgress.finished,
        success: functionProgress.success,
        source: functionProgress.source,
        funcName: functionHeaders.funcName,
      })
      .from(functionProgress)
      .innerJoin(
        functionHeaders,
        eq(functionProgress.funcHeaderId, functionHeaders.id)
      )
      .where(eq(functionProgress.parentId, funcId));

    return {
      function: func,
      logs,
      children,
    };
  } catch (err) {
    console.error("Error fetching function details:", err);
    throw error(500, "Internal server error");
  }
};
