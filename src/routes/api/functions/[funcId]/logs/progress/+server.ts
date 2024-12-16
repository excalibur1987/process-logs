import { db } from '$lib/db';
import { functionProgressTracking } from '$lib/db/schema';
import {
	getFunctionInstanceById,
	getFunctionInstanceBySlug,
	type FunctionInstance
} from '$lib/db/utils';
import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

export async function GET({ params, url }) {
	try {
		let func: FunctionInstance;

		if (parseInt(params.funcId).toString().length !== params.funcId.length) {
			func = await getFunctionInstanceBySlug(params.funcId);
		} else {
			func = await getFunctionInstanceById(parseInt(params.funcId));
		}

		const progressId = url.searchParams.get('progressId');

		// Get progress tracking records
		const filters = [eq(functionProgressTracking.funcId, func.funcId)];
		if (progressId) {
			filters.push(eq(functionProgressTracking.progId, progressId));
		}
		const query = db
			.select()
			.from(functionProgressTracking)
			.where(and(...filters));

		const progress = await query.execute();

		return json({
			success: true,
			progress: progress.map((p) => ({
				id: p.id,
				funcId: p.funcId,
				progId: p.progId,
				title: p.title,
				description: p.description,
				currentValue: p.currentValue,
				maxValue: p.maxValue,
				duration: p.duration,
				lastUpdated: p.lastUpdated,
				completed: p.completed,
				percentage: (Number(p.currentValue) / Number(p.maxValue)) * 100
			}))
		});
	} catch (error) {
		console.error('Error fetching progress:', error);
		return new Response('Internal server error', { status: 500 });
	}
}
