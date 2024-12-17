import { db } from '$lib/db';
import { functionProgress } from '$lib/db/schema';
import type { FunctionInstance } from '$lib/db/utils';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils';
import { validateWithContext } from '$lib/utils/zod-error';
import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

export async function POST({ request, params }) {
	try {
		let func: FunctionInstance;

		if (parseInt(params.funcId).toString().length !== params.funcId.length) {
			func = await getFunctionInstanceBySlug(params.funcId);
		} else {
			func = await getFunctionInstanceById(parseInt(params.funcId));
		}

		// Validate request body
		const schema = z.object({
			success: z.boolean()
		});

		const body = await request.json();
		const { success } = validateWithContext(
			schema,
			body,
			'POST /api/functions/[funcName]/[funcId]/set-finished'
		);

		// Get all child functions if any
		const childFunctions = await db
			.select({
				funcId: functionProgress.funcId,
				finished: functionProgress.finished,
				success: functionProgress.success
			})
			.from(functionProgress)
			.where(eq(functionProgress.parentId, func.funcId));

		// Check if all children are successful (if there are any)
		const allChildrenSuccessful =
			childFunctions.length === 0 ||
			childFunctions.every((child) => child.finished && child.success);

		// Only set success to true if requested success is true AND all children are successful
		const finalSuccess = success && allChildrenSuccessful;

		// Update the function progress
		const [updatedFunction] = await db
			.update(functionProgress)
			.set({
				endDate: new Date().toISOString(),
				finished: true,
				success: finalSuccess
			})
			.where(and(eq(functionProgress.funcId, func.funcId)))
			.returning();

		if (!updatedFunction) {
			return new Response('Function not found', { status: 404 });
		}

		return json({
			success: finalSuccess,
			message: finalSuccess
				? 'Function marked as finished successfully'
				: 'Function marked as finished with failures',
			childrenStatus:
				childFunctions.length > 0
					? {
							total: childFunctions.length,
							successful: childFunctions.filter((c) => c.finished && c.success).length,
							failed: childFunctions.filter((c) => c.finished && !c.success).length,
							running: childFunctions.filter((c) => !c.finished).length
						}
					: null
		});
	} catch (error) {
		console.error('Error setting function finished status:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'An unknown error occurred' },
			{ status: 400 }
		);
	}
}
