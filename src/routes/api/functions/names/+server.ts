import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { functionHeaders } from "$lib/db/schema";
import { ilike } from "drizzle-orm";

export async function GET({ url }) {
  const search = url.searchParams.get("search") || "";

  const functions = await db
    .select({
      id: functionHeaders.id,
      funcName: functionHeaders.funcName,
    })
    .from(functionHeaders)
    .where(ilike(functionHeaders.funcName, `%${search}%`))
    .limit(10);

  return json(functions);
}
