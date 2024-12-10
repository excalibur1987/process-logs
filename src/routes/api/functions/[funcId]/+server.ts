import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { functionProgress, functionLogs } from "$lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET({ params }) {
  const funcId = parseInt(params.funcId);

  if (isNaN(funcId)) {
    return new Response("Invalid function ID", { status: 400 });
  }

  try {
    // Get function details
    const [func] = await db
      .select()
      .from(functionProgress)
      .where(eq(functionProgress.funcId, funcId));

    if (!func) {
      return new Response("Function not found", { status: 404 });
    }

    // Get function logs
    const logs = await db
      .select()
      .from(functionLogs)
      .where(eq(functionLogs.funcId, funcId))
      .orderBy(functionLogs.rowDate);

    return json({
      function: func,
      logs,
    });
  } catch (error) {
    console.error("Error fetching function details:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Endpoint to update function status
export async function PATCH({ params, request }) {
  const funcId = parseInt(params.funcId);

  if (isNaN(funcId)) {
    return new Response("Invalid function ID", { status: 400 });
  }

  try {
    const data = await request.json();
    const { finished, success, endDate } = data;

    const [updatedFunc] = await db
      .update(functionProgress)
      .set({
        finished,
        success,
        endDate: endDate ? new Date(endDate) : undefined,
      })
      .where(eq(functionProgress.funcId, funcId))
      .returning();

    return json(updatedFunc);
  } catch (error) {
    console.error("Error updating function:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Endpoint to add logs to a function
export async function POST({ params, request }) {
  const funcId = parseInt(params.funcId);

  if (isNaN(funcId)) {
    return new Response("Invalid function ID", { status: 400 });
  }

  try {
    const data = await request.json();
    const { type, message, traceBack } = data;

    const [log] = await db
      .insert(functionLogs)
      .values({
        funcId,
        type,
        message,
        traceBack,
        rowDate: new Date(),
      })
      .returning();

    return json(log);
  } catch (error) {
    console.error("Error adding log:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
