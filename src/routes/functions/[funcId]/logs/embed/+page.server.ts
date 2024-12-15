import { db } from '$lib/db';
import { functionLogs } from '$lib/db/schema';
import {
	getFunctionInstanceById,
	getFunctionInstanceBySlug,
	type FunctionInstance
} from '$lib/db/utils';
import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		// Get function details with header information

		let func: FunctionInstance;

		if (parseInt(params.funcId).toString().length !== params.funcId.length) {
			func = await getFunctionInstanceBySlug(params.funcId);
		} else {
			func = await getFunctionInstanceById(parseInt(params.funcId));
		}

		if (!func) {
			return {
				function: undefined,
				logs: undefined
			};
		}

		// Get logs
		const logs = db
			.select()
			.from(functionLogs)
			.where(eq(functionLogs.funcId, func.funcId))
			.orderBy(asc(functionLogs.rowDate));

		return {
			function: func,
			logs
		};
	} catch (err) {
		console.error('Error fetching function details:', err);
		throw error(500, 'Internal server error');
	}
};
