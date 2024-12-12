import { db } from "$lib/db";
import {
  functionProgress,
  functionHeaders,
  functionLogs,
} from "$lib/db/schema";
import { eq, asc } from "drizzle-orm";
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

    // Get logs
    const logs = db
      .select()
      .from(functionLogs)
      .where(eq(functionLogs.funcId, funcId))
      .orderBy(asc(functionLogs.rowDate));

    return {
      function: func,
      logs,
    };
  } catch (err) {
    console.error("Error fetching function details:", err);
    throw error(500, "Internal server error");
  }
};
