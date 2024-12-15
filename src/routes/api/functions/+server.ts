import { db } from '$lib/db';
import { functionHeaders, functionLogs, functionProgress } from '$lib/db/schema';
import { json } from '@sveltejs/kit';
import { and, between, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import { z } from 'zod';

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
				traceBack: z.string()
			})
		)
	});

	const parsedData = schema.safeParse(data);
	if (!parsedData.success) {
		throw new Error('Invalid data format');
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
			success: false
		})
		.returning();

	if (logs.length > 0) {
		await db.insert(functionLogs).values(
			logs.map((log) => ({
				funcId: progress.funcId,
				rowDate: new Date().toISOString(),
				type: log.type,
				message: log.message,
				traceBack: log.traceBack
			}))
		);
	}

	return json({ funcId: progress.funcId });
}

export async function GET({ url }) {
	const funcName = url.searchParams.get('funcName');
	const slug = url.searchParams.get('slug');
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');
	const isParent = url.searchParams.get('isParent');
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const offset = (page - 1) * limit;

	const filters = [
		or(
			ilike(functionHeaders.funcName, `${funcName ? `%${funcName}%` : ''}`),
			ilike(functionProgress.slug, `${slug ? `%${slug}%` : ''}`),
			eq(sql<string>`${funcName || ''}`, sql`''`)
		)
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

	// Base query for both total count and results
	const baseQuery = db
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
			funcSlug: functionHeaders.funcSlug
		})
		.from(functionProgress)
		.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
		.where(and(...filters));

	// Get total count
	const totalCount = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(functionProgress)
		.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
		.where(and(...filters))
		.then(([{ count }]) => Number(count));

	// Get paginated results
	const results = await baseQuery
		.orderBy(desc(functionProgress.startDate))
		.limit(limit)
		.offset(offset);

	// Calculate summary from current page results
	const summary = {
		total: totalCount,
		running: results.filter((r) => !r.finished).length,
		succeeded: results.filter((r) => r.finished && r.success).length,
		failed: results.filter((r) => r.finished && !r.success).length
	};

	return json({
		summary,
		results,
		pagination: {
			page,
			limit,
			totalPages: Math.ceil(totalCount / limit),
			totalCount
		}
	});
}
