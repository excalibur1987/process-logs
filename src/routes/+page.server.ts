import { db } from '$lib/db';
import { functionHeaders, functionProgress } from '$lib/db/schema';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const today = new Date();
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 1);

	// Get all functions for total counts
	const allResults = await db
		.select({
			funcId: functionProgress.funcId,
			finished: functionProgress.finished,
			success: functionProgress.success
		})
		.from(functionProgress)
		.where(
			and(
				gte(functionProgress.startDate, sevenDaysAgo.toISOString()),
				lte(functionProgress.startDate, today.toISOString())
			)
		);

	// Get only parent functions for display
	const parentResults = await db
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
		.where(isNull(functionProgress.parentId))
		.orderBy(desc(functionProgress.startDate))
		.limit(10);

	const summary = {
		total: allResults.length,
		running: allResults.filter((r) => !r.finished).length,
		succeeded: allResults.filter((r) => r.finished && r.success).length,
		failed: allResults.filter((r) => r.finished && !r.success).length,
		results: parentResults
	};

	return { summary };
};
