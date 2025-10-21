import { db } from '$lib/db';
import { functionHeaders, functionLogs, functionProgress } from '$lib/db/schema';
import { format } from 'date-fns';
import { and, between, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Get search parameters from URL
	const funcHeaderId = url.searchParams.get('funcHeaderId');
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');
	const status = url.searchParams.get('status') || 'all';
	const parentOnly = url.searchParams.get('parentOnly') === 'true';
	const minDuration = url.searchParams.get('minDuration');
	const maxDuration = url.searchParams.get('maxDuration');
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const offset = (page - 1) * limit;

	// Set default date range to last 7 days if not provided
	const defaultEnd = new Date();
	const defaultStart = new Date();
	defaultStart.setDate(defaultStart.getDate() - 7);

	const defaultStartDate = format(defaultStart, 'yyyy-MM-dd');
	const defaultEndDate = format(defaultEnd, 'yyyy-MM-dd');

	const effectiveStartDate = startDate || defaultStartDate;
	const effectiveEndDate = endDate || defaultEndDate;

	// Build filters
	const filters = [];

	// Add date filter
	filters.push(
		between(
			sql<Date>`${functionProgress.startDate}::date`,
			new Date(effectiveStartDate).toISOString(),
			new Date(effectiveEndDate).toISOString()
		)
	);

	// Add function header filter if provided
	if (funcHeaderId) {
		filters.push(eq(functionProgress.funcHeaderId, parseInt(funcHeaderId)));
	}

	// Add status filter
	if (status !== 'all') {
		if (status === 'running') {
			filters.push(eq(functionProgress.finished, false));
		} else if (status === 'success') {
			filters.push(and(eq(functionProgress.finished, true), eq(functionProgress.success, true)));
		} else if (status === 'failed') {
			filters.push(and(eq(functionProgress.finished, true), eq(functionProgress.success, false)));
		}
	}

	// Add parent-only filter if enabled
	if (parentOnly) {
		filters.push(isNull(functionProgress.parentId));
	}

	// Add duration filters
	if (minDuration || maxDuration) {
		const durationFilter = sql`EXTRACT(EPOCH FROM (${functionProgress.endDate} - ${functionProgress.startDate}))`;

		if (minDuration) {
			filters.push(sql`${durationFilter} >= ${parseInt(minDuration)}`);
		}
		if (maxDuration) {
			filters.push(sql`${durationFilter} <= ${parseInt(maxDuration)}`);
		}
	}

	// Get total count
	const totalCount = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(functionProgress)
		.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
		.where(and(...filters))
		.then(([{ count }]) => Number(count));

	// Get paginated results
	const results = await db
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
		.where(and(...filters))
		.orderBy(desc(functionProgress.startDate))
		.limit(limit)
		.offset(offset);

	// Get available sources
	const sources = await db
		.selectDistinct({
			source: functionProgress.source
		})
		.from(functionProgress)
		.where(sql`${functionProgress.source} != ''`)
		.orderBy(functionProgress.source);

	return {
		results,
		pagination: {
			page,
			limit,
			totalPages: Math.ceil(totalCount / limit),
			totalCount
		},
		defaultDates: {
			startDate: effectiveStartDate,
			endDate: effectiveEndDate
		},
		sources: sources.map((s) => s.source)
	};
};

export const actions = {
	search: async ({ request, url }) => {
		const formData = await request.formData();
		const funcHeaderId = formData.get('funcHeaderId')?.toString();
		const startDate = formData.get('startDate')?.toString();
		const endDate = formData.get('endDate')?.toString();
		const status = formData.get('status')?.toString() || 'all';
		const parentOnly = formData.get('parentOnly') === 'true';
		const minDuration = formData.get('minDuration')?.toString();
		const maxDuration = formData.get('maxDuration')?.toString();
		const sources = formData.getAll('sources[]').map((s) => s.toString());
		const page = parseInt(formData.get('page')?.toString() || '1');
		const limit = parseInt(formData.get('limit')?.toString() || '10');
		const offset = (page - 1) * limit;

		const filters = [];

		// Add date filter if provided
		if (startDate && endDate) {
			filters.push(
				between(
					sql<Date>`${functionProgress.startDate}::date`,
					new Date(startDate).toISOString(),
					new Date(endDate).toISOString()
				)
			);
		}

		// Add function header filter if provided
		if (funcHeaderId) {
			filters.push(eq(functionProgress.funcHeaderId, parseInt(funcHeaderId)));
		}

		// Add status filter
		if (status !== 'all') {
			if (status === 'running') {
				filters.push(eq(functionProgress.finished, false));
			} else if (status === 'success') {
				filters.push(and(eq(functionProgress.finished, true), eq(functionProgress.success, true)));
			} else if (status === 'failed') {
				filters.push(and(eq(functionProgress.finished, true), eq(functionProgress.success, false)));
			}
		}

		// Add parent-only filter if enabled
		if (parentOnly) {
			filters.push(isNull(functionProgress.parentId));
		}

		// Add duration filters
		if (minDuration || maxDuration) {
			const durationFilter = sql`EXTRACT(EPOCH FROM (${functionProgress.endDate} - ${functionProgress.startDate}))`;

			if (minDuration) {
				filters.push(sql`${durationFilter} >= ${parseInt(minDuration)}`);
			}
			if (maxDuration) {
				filters.push(sql`${durationFilter} <= ${parseInt(maxDuration)}`);
			}
		}

		// Add source filter
		if (sources.length > 0) {
			filters.push(inArray(functionProgress.source, sources));
		}

		// Get total count
		const totalCount = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(functionProgress)
			.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
			.where(and(...filters))
			.then(([{ count }]) => Number(count));

		// Get paginated results
		const results = await db
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
			.where(and(...filters))
			.orderBy(desc(functionProgress.startDate))
			.limit(limit)
			.offset(offset);

		return {
			results,
			pagination: {
				page,
				limit,
				totalPages: Math.ceil(totalCount / limit),
				totalCount
			}
		};
	},

	markAsFailed: async ({ request }) => {
		const formData = await request.formData();
		const funcIds = formData.getAll('funcIds[]').map((id) => parseInt(id.toString()));

		if (funcIds.length === 0) {
			return { success: false, error: 'No functions selected' };
		}

		try {
			const lastLogDates = db.$with('last_log_dates').as(
				db
					.select({
						funcId: functionProgress.funcId,
						lastLogDate:
							sql<Date>`coalesce(max(${functionLogs.rowDate}), ${functionProgress.startDate} + interval '15 minutes')`
								.mapWith(Date)
								.as('last_log_date')
					})
					.from(functionProgress)
					.leftJoin(functionLogs, eq(functionProgress.funcId, functionLogs.funcId))
					.where(inArray(functionProgress.funcId, funcIds))
					.groupBy(functionProgress.funcId, functionProgress.startDate)
			);

			const updatedFuncsQuery = db
				.with(lastLogDates)
				.update(functionProgress)
				.set({
					finished: true,
					success: false,
					endDate: sql<Date>`COALESCE(${lastLogDates.lastLogDate}, ${new Date().toISOString()})`
				})
				.from(lastLogDates)
				.where(eq(functionProgress.funcId, lastLogDates.funcId))
				.returning()
				.prepare('updated_funcs');

			const updatedFuncs = await updatedFuncsQuery.execute();

			return { success: true, updatedFuncs };
		} catch (err) {
			console.error('Error marking functions as failed:', err);
			return { success: false, error: 'Failed to update functions' };
		}
	}
} satisfies Actions;
