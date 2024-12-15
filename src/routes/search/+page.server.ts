import { db } from '$lib/db';
import { functionHeaders, functionProgress } from '$lib/db/schema';
import { format } from 'date-fns';
import { and, between, desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Get search parameters from URL
	const funcHeaderId = url.searchParams.get('funcHeaderId');
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');
	const status = url.searchParams.get('status') || 'all';
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
		},
		defaultDates: {
			startDate: effectiveStartDate,
			endDate: effectiveEndDate
		}
	};
};

export const actions = {
	search: async ({ request, url }) => {
		const formData = await request.formData();
		const funcHeaderId = formData.get('funcHeaderId')?.toString();
		const startDate = formData.get('startDate')?.toString();
		const endDate = formData.get('endDate')?.toString();
		const status = formData.get('status')?.toString() || 'all';
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
	}
} satisfies Actions;
