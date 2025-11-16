import { db } from '$lib/db';
import { functionLogs, functionProgress } from '$lib/db/schema';
import type { FunctionInstance } from '$lib/db/utils';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils';
import { validateWithContext } from '$lib/utils/zod-error';
import { json } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';

export async function GET({ params, url }) {
	try {
		// Get function details
		let func: FunctionInstance | null;
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

		// Get function logs with join to get function details and progress data
		const logsQuery = db
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
				}
			})
			.from(functionLogs)
			.leftJoin(functionProgress, eq(functionLogs.funcId, functionProgress.funcId))
			.where(and(...conditions))
			.orderBy(functionLogs.rowDate);
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
