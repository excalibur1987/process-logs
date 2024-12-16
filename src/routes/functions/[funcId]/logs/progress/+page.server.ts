import {
	getFunctionInstanceById,
	getFunctionInstanceBySlug,
	type FunctionInstance
} from '$lib/db/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	try {
		let func: FunctionInstance;

		if (parseInt(params.funcId).toString().length !== params.funcId.length) {
			func = await getFunctionInstanceBySlug(params.funcId);
		} else {
			func = await getFunctionInstanceById(parseInt(params.funcId));
		}

		if (!func) {
			throw error(404, 'Function not found');
		}

		const progressId = url.searchParams.get('progressId');
		const progressUrl = `/api/functions/${func.funcId}/logs/progress${progressId ? `?progressId=${progressId}` : ''}`;
		const progress = fetch(progressUrl).then((response) => response.json());

		return {
			function: func,
			progress
		};
	} catch (err) {
		console.error('Error fetching function details:', err);
		throw error(500, 'Internal server error');
	}
};
