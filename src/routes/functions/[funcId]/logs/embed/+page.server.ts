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

export const load: PageServerLoad = async ({ params }) => {
  try {
    // Get function details with header information

    let func: FunctionInstance;

    if (parseInt(params.funcId).toString().length !== params.funcId.length) {
      func = await getFunctionInstanceBySlug(params.funcId);
    } else {
      func = await getFunctionInstanceById(parseInt(params.funcId));
    }

    if (!func) {
      return {
        function: {
          funcId: params.funcId,
          funcName: "",
          finished: false,
          success: false,
        },
        logs: undefined,
      };
    }

    // Get logs
    const logs = db
      .select()
      .from(functionLogs)
      .where(eq(functionLogs.funcId, func.funcId))
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
