import { db } from '$lib/db';
import { functionHeaders, functionLogs, functionProgress } from '$lib/db/schema';
import {
	getFunctionInstanceById,
	getFunctionInstanceBySlug,
	type FunctionInstance
} from '$lib/db/utils';
import { error } from '@sveltejs/kit';
import { exec } from 'child_process';
import { desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

async function markFunctionAsFailed(funcId: number) {
	// Get the last log date
	const [lastLog] = await db
		.select({
			rowDate: functionLogs.rowDate
		})
		.from(functionLogs)
		.where(eq(functionLogs.funcId, funcId))
		.orderBy(desc(functionLogs.rowDate))
		.limit(1);

	const [updatedFunc] = await db
		.update(functionProgress)
		.set({
			finished: true,
			success: false,
			endDate: lastLog?.rowDate || new Date().toISOString()
		})
		.where(eq(functionProgress.funcId, funcId))
		.returning();
	return updatedFunc;
}

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const includeLogs = (url.searchParams.get('logs') || 'true') === 'true';

	try {
		// Get function details with header information
		let func: FunctionInstance | null;
		if (parseInt(params.funcId).toString().length !== params.funcId.length) {
			func = await getFunctionInstanceBySlug(params.funcId);
		} else {
			func = await getFunctionInstanceById(parseInt(params.funcId));
		}

		if (!func) {
			throw error(404, 'Function not found');
		}

		// Get child functions if any
		const children = await db
			.select({
				funcId: functionProgress.funcId,
				slug: functionProgress.slug,
				startDate: functionProgress.startDate,
				endDate: functionProgress.endDate,
				finished: functionProgress.finished,
				success: functionProgress.success,
				processId: functionProgress.processId,
				funcName: functionHeaders.funcName
			})
			.from(functionProgress)
			.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
			.where(eq(functionProgress.parentId, func.funcId));

		// Get logs
		const logs = fetch(`/api/functions/${func.funcId}/logs`).then(async (response) => {
			const data = await response.json();
			return data.logs;
		});

		return {
			function: func,
			children,
			logs
		};
	} catch (err) {
		console.error('Error fetching function details:', err);
		throw error(500, 'Internal server error');
	}
};

export const actions: Actions = {
	markAsFailed: async ({ params }) => {
		try {
			let func: FunctionInstance | null;
			if (parseInt(params.funcId).toString().length !== params.funcId.length) {
				func = await getFunctionInstanceBySlug(params.funcId);
			} else {
				func = await getFunctionInstanceById(parseInt(params.funcId));
			}

			if (!func) {
				throw error(404, 'Function not found');
			}
			const updatedFunc = await markFunctionAsFailed(func.funcId);

			return { success: true, function: updatedFunc };
		} catch (err) {
			console.error('Error marking function as failed:', err);
			throw error(500, 'Failed to update function status');
		}
	},
	killProcess: async ({ params }) => {
		// Placeholder for killing the process logic
		let func: FunctionInstance | null;
		if (parseInt(params.funcId).toString().length !== params.funcId.length) {
			func = await getFunctionInstanceBySlug(params.funcId);
		} else {
			func = await getFunctionInstanceById(parseInt(params.funcId));
		}
		if (!func) {
			throw error(404, 'Function not found');
		}

		if (!func.processId) {
			throw error(400, 'No process ID associated with this function');
		}
		const processName = func.processId;
		let success = false;
		exec(`sudo systemctl restart psc-server-worker@${processName}.service`, (err, stdout) => {
			if (err) return console.log('No matching processes found');
			success = true;
			return;
		});
		const updatedFunc = await markFunctionAsFailed(func.funcId);

		return { success, function: updatedFunc };
	}
};
