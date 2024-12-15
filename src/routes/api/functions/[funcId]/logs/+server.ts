import { db } from '$lib/db';
import { functionHeaders, functionLogs, functionProgress } from '$lib/db/schema';
import {
	getFunctionInstanceById,
	getFunctionInstanceBySlug,
	type FunctionInstance
} from '$lib/db/utils';
import { json } from '@sveltejs/kit';
import { asc, eq, inArray } from 'drizzle-orm';

export async function GET({ params }) {
	let func: FunctionInstance;

	if (parseInt(params.funcId).toString().length !== params.funcId.length) {
		func = await getFunctionInstanceBySlug(params.funcId);
	} else {
		func = await getFunctionInstanceById(parseInt(params.funcId));
	}

	try {
		// First, get all child functions recursively
		const getAllChildFuncIds = async (parentId: number): Promise<number[]> => {
			const children = await db
				.select({
					funcId: functionProgress.funcId
				})
				.from(functionProgress)
				.where(eq(functionProgress.parentId, parentId));

			const childIds = children.map((c) => c.funcId);
			const grandChildIds = await Promise.all(childIds.map(getAllChildFuncIds));
			return [parentId, ...childIds, ...grandChildIds.flat()];
		};

		const allFuncIds = await getAllChildFuncIds(func.funcId);

		// Get all function info for these IDs
		const functionInfo = await db
			.select({
				funcId: functionProgress.funcId,
				funcName: functionHeaders.funcName,
				funcSlug: functionHeaders.funcSlug,
				parentId: functionProgress.parentId
			})
			.from(functionProgress)
			.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
			.where(inArray(functionProgress.funcId, allFuncIds));

		// Create a map for quick function info lookup
		const functionInfoMap = Object.fromEntries(functionInfo.map((f) => [f.funcId, f]));

		// Get all logs with function info
		const logs = await db
			.select({
				id: functionLogs.id,
				rowDate: functionLogs.rowDate,
				funcId: functionLogs.funcId,
				type: functionLogs.type,
				message: functionLogs.message,
				traceBack: functionLogs.traceBack
			})
			.from(functionLogs)
			.where(inArray(functionLogs.funcId, allFuncIds))
			.orderBy(asc(functionLogs.rowDate));

		// Enhance logs with function info
		const enhancedLogs = logs.map((log) => ({
			...log,
			function: functionInfoMap[log.funcId]
		}));

		return json(enhancedLogs);
	} catch (error) {
		console.error('Error fetching logs:', error);
		return new Response('Internal server error', { status: 500 });
	}
}
