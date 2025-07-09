import { db } from '$lib/db';
import { functionHeaders, functionProgress } from '$lib/db/schema';
import { validateWithContext } from '$lib/utils/zod-error';
import { json } from '@sveltejs/kit';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';

export async function GET({ params, request }) {
	const funcName = params.funcName;

	const requestSchema = z.object({
		period: z.enum(['hour', 'day', 'week', 'month', 'year']),
		interval: z.number({ coerce: true }),
		funcSlug: z.string(),
		args: z
			.any()
			.optional()
			.transform((data) => {
				return data ? JSON.parse(data) : {};
			})
	});

	try {
		const { period, interval, funcSlug, args } = validateWithContext(
			requestSchema,
			Object.fromEntries(new URL(request.url).searchParams.entries()),
			'GET /api/functions/[funcName]/get-runs-summary'
		);

		const [funcHeader] = await db
			.select()
			.from(functionHeaders)
			.where(eq(sql<string>`slugify(${functionHeaders.funcName})`, funcName));
		if (!funcHeader) {
			return json({ error: 'Function not found' }, { status: 404 });
		}

		const intervals = {
			hour: 1000 * 60 * 60,
			day: 1000 * 60 * 60 * 24,
			week: 1000 * 60 * 60 * 24 * 7,
			month: 1000 * 60 * 60 * 24 * 30,
			year: 1000 * 60 * 60 * 24 * 365
		};

		const startDate = new Date(new Date().getTime() - interval * intervals[period]);

		const queryArgs = JSON.parse(args ? JSON.stringify(args) : '{}') as Record<string, any>;

		const argKeys = Object.keys(queryArgs || {});

		let filters: any[] = [];
		if (argKeys.length > 0) {
			filters = argKeys
				.filter((key) => queryArgs[key] !== undefined && key !== 'force_run_wrapper')
				.map((key) => eq(sql`${functionProgress.args}->>'${key}'`, JSON.stringify(queryArgs[key])));
		}
		const query = db
			.select({
				count: sql<number>`count(*)`.mapWith(Number).as('count'),
				avg_duration:
					sql<number>`extract(epoch from avg(${functionProgress.endDate} - ${functionProgress.startDate}))`
						.mapWith(Number)
						.as('avg_duration'),
				pending: sql<number>`sum(case when ${functionProgress.finished} is null then 1 else 0 end)`
					.mapWith(Number)
					.as('pending')
			})
			.from(functionProgress)
			.where(
				and(
					eq(functionProgress.funcId, funcHeader.id),
					gte(functionProgress.startDate, startDate.toISOString()),
					...filters
				)
			);

		const [runs] = await query.execute();

		return json({ runs });
	} catch (error) {
		console.error('Error getting runs summary:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'An unknown error occurred' },
			{ status: 400 }
		);
	}
}
