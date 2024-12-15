import { db } from '$lib/db';
import { functionProgressTracking } from '$lib/db/schema';
import type { FunctionInstance } from '$lib/db/utils';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils';
import { json } from '@sveltejs/kit';
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
			prog_id: z.string(),
			title: z.string(),
			description: z.string(),
			value: z.number(),
			max: z.number(),
			duration: z.number().optional()
		});

		const body = await request.json();
		const progressData = schema.parse(JSON.parse(body));

		// Update or insert progress tracking
		const [updatedProgress] = await db
			.insert(functionProgressTracking)
			.values({
				funcId: func.funcId,
				progId: progressData.prog_id,
				title: progressData.title,
				description: progressData.description,
				currentValue: progressData.value,
				maxValue: progressData.max,
				duration: progressData.duration,
				lastUpdated: new Date().toISOString(),
				completed: progressData.value >= progressData.max
			})
			.returning();

		return json({
			success: true,
			message: 'Progress updated successfully',
			progress: updatedProgress
		});
	} catch (error) {
		console.error('Error updating progress:', error);
		return new Response(
			error instanceof z.ZodError ? 'Invalid request body' : 'Internal server error',
			{ status: error instanceof z.ZodError ? 400 : 500 }
		);
	}
}
