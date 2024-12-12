import { db } from "$lib/db";
import {
  functionProgress,
  functionHeaders,
  functionLogs,
} from "$lib/db/schema";
import { eq, or, asc, SQL } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  getFunctionInstanceById,
  getFunctionInstanceBySlug,
  type FunctionInstance,
} from "$lib/db/utils";

export const load: PageServerLoad = async ({ params, url }) => {
  const includeLogs = (url.searchParams.get("logs") || "true") === "true";

  try {
    // Get function details with header information
    let func: FunctionInstance;
    if (isNaN(parseInt(params.funcId))) {
      func = await getFunctionInstanceBySlug(params.funcId);
    } else {
      func = await getFunctionInstanceById(parseInt(params.funcId));
    }

    if (!func) {
      throw error(404, "Function not found");
    }

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
      .where(eq(functionProgress.parentId, func.funcId));

    // Get logs if requested
    const logs = includeLogs
      ? db
          .select()
          .from(functionLogs)
          .where(eq(functionLogs.funcId, func.funcId))
          .orderBy(asc(functionLogs.rowDate))
      : undefined;

    return {
      function: func,
      children,
      logs,
    };
  } catch (err) {
    console.error("Error fetching function details:", err);
    throw error(500, "Internal server error");
  }
};
