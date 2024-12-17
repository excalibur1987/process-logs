import { db } from '$lib/db';
import { functionLogs, functionProgress, functionProgressTracking } from '$lib/db/schema';
import type { FunctionInstance } from '$lib/db/utils';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils';
import { validateWithContext } from '$lib/utils/zod-error';
import { json } from '@sveltejs/kit';
import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';

export async function GET({ params, url }) {
	try {
		// Get function details
		let func: FunctionInstance;
		const funcId = params.funcId;

		if (parseInt(funcId).toString().length !== funcId.length) {
			func = await getFunctionInstanceBySlug(funcId);
		} else {
			func = await getFunctionInstanceById(parseInt(funcId));
		}

		if (!func) {
			return json({ error: 'Function not found' }, { status: 404 });
		}

		// Parse query parameters
		const requestSchema = z.object({
			lastLogDate: z.string().datetime().optional()
		});

		const { lastLogDate } = validateWithContext(
			requestSchema,
			Object.fromEntries(url.searchParams.entries()),
			'GET /api/functions/[funcName]/[funcId]/logs'
		);

		// Build query conditions
		const conditions = [eq(functionLogs.funcId, func.funcId)];
		if (lastLogDate) {
			conditions.push(gt(functionLogs.rowDate, lastLogDate));
		}

		// Subquery to get latest progress tracking for each prog_id
		const latestProgress = db.$with('latest_progress').as(
			db
				.select({
					funcId: functionProgressTracking.funcId,
					progId: functionProgressTracking.progId,
					progressData: sql<string>`json_build_object(
							'prog_id', ${functionProgressTracking.progId},
							'title', ${functionProgressTracking.title},
							'description', ${functionProgressTracking.description},
							'value', ${functionProgressTracking.currentValue},
							'max', ${functionProgressTracking.maxValue},
							'duration', ${functionProgressTracking.duration},
							'completed', ${functionProgressTracking.completed},
							'lastUpdated', ${functionProgressTracking.lastUpdated}
						)`.as('progress_data')
				})
				.from(functionProgressTracking)
				.where(
					sql`(${functionProgressTracking.funcId}, ${functionProgressTracking.progId}, ${functionProgressTracking.lastUpdated}) in (
							select 
								func_id, 
								prog_id, 
								max(last_updated) 
							from function_progress_tracking 
							group by func_id, prog_id
						)`
				)
		);

		// Get function logs with join to get function details and progress data
		const logsQuery =  db
			.with(latestProgress)
			.select({
				id: functionLogs.id,
				funcId: functionLogs.funcId,
				type: functionLogs.type,
				message: functionLogs.message,
				traceBack: functionLogs.traceBack,
				rowDate: functionLogs.rowDate,
				function: {
					funcId: functionProgress.funcId,
					funcName: functionProgress.slug,
					funcSlug: functionProgress.slug,
					parentId: functionProgress.parentId
				},
				progress: sql<string>`case 
					when ${functionLogs.type} = 'PROGRESS' then ${latestProgress.progressData} 
					else null 
				end`.as('progress')
			})
			.from(functionLogs)
			.leftJoin(functionProgress, eq(functionLogs.funcId, functionProgress.funcId))
			.leftJoin(
				latestProgress,
				and(
					eq(functionLogs.type, 'PROGRESS'),
					eq(functionLogs.message, latestProgress.progId),
					eq(functionLogs.funcId, latestProgress.funcId)
				)
			)
			.where(and(...conditions))
			.orderBy(functionLogs.rowDate);
		console.log('🚀 ~ file: +server.ts:75 ~ GET ~ logsQuery:', logsQuery.toSQL());
		const logs = await logsQuery.execute();
		return json({
			function: func,
			logs
		});
	} catch (error) {
		console.error('Error fetching logs:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'An unknown error occurred' },
			{ status: 500 }
		);
	}
}
