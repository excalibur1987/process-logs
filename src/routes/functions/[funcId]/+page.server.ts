import { db } from '$lib/db';
import { functionHeaders, functionProgress } from '$lib/db/schema';
import {
	getFunctionInstanceById,
	getFunctionInstanceBySlug,
	type FunctionInstance
} from '$lib/db/utils';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const includeLogs = (url.searchParams.get('logs') || 'true') === 'true';

	try {
		// Get function details with header information
		let func: FunctionInstance;
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
				source: functionProgress.source,
				funcName: functionHeaders.funcName
			})
			.from(functionProgress)
			.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
			.where(eq(functionProgress.parentId, func.funcId));

		// Get logs if requested
		// Get logs
		const logs = fetch(`/api/functions/${func.funcId}/logs`).then((response) => response.json());

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
