import { db } from '$lib/db';
import { functionLogs } from '$lib/db/schema';
import {
	getFunctionInstanceById,
	getFunctionInstanceBySlug,
	type FunctionInstance
} from '$lib/db/utils';
import { json } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';

export async function GET({ params }) {
	let func: FunctionInstance;

	if (parseInt(params.funcId).toString().length !== params.funcId.length) {
		func = await getFunctionInstanceBySlug(params.funcId);
	} else {
		func = await getFunctionInstanceById(parseInt(params.funcId));
	}

	try {
		const logs = await db
			.select()
			.from(functionLogs)
			.where(eq(functionLogs.funcId, func.funcId))
			.orderBy(asc(functionLogs.rowDate));

		return json(logs);
	} catch (error) {
		console.error('Error fetching logs:', error);
		return new Response('Internal server error', { status: 500 });
	}
}
