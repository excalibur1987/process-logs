import {
	getFunctionInstanceById,
	getFunctionInstanceBySlug,
	type FunctionInstance
} from '$lib/db/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
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

		const logs = fetch(`/api/functions/${func.funcId}/logs`).then((response) => response.json());

		return {
			function: func,
			logs
		};
	} catch (err) {
		console.error('Error fetching function details:', err);
		throw error(500, 'Internal server error');
	}
};
