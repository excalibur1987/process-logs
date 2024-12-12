import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { functionLogs } from "$lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET({ params }) {
  const funcId = parseInt(params.funcId);

  if (isNaN(funcId)) {
    return new Response("Invalid function ID", { status: 400 });
  }

  try {
    const logs = await db
      .select()
      .from(functionLogs)
      .where(eq(functionLogs.funcId, funcId))
      .orderBy(asc(functionLogs.rowDate));

    return json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
