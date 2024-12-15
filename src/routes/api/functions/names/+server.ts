import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { functionHeaders } from "$lib/db/schema";
import { ilike, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function GET({ url }) {
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: functionHeaders.id,
      funcName: functionHeaders.funcName,
      funcSlug: functionHeaders.funcSlug,
    })
    .from(functionHeaders)
    .where(
      search.trim()
        ? ilike(functionHeaders.funcName, `%${search}%`)
        : undefined,
    )
    .orderBy(desc(functionHeaders.id))
    .limit(limit)
    .offset(offset);

  const [functions, totalCount] = await Promise.all([
    query,
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number).as("count") })
      .from(functionHeaders)
      .where(
        search.trim()
          ? ilike(functionHeaders.funcName, `%${search}%`)
          : undefined,
      )
      .then(([{ count }]) => Number(count)),
  ]);

  return json({
    functions,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
  });
}
