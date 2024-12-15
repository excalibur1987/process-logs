import { db } from '$lib/db';
import { functionLogs, functionProgress } from '$lib/db/schema';
import type { FunctionInstance } from '$lib/db/utils';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function GET({ params }) {
	try {
		// Get function details
		let func: FunctionInstance;

		if (parseInt(params.funcId).toString().length !== params.funcId.length) {
			func = await getFunctionInstanceBySlug(params.funcId);
		} else {
			func = await getFunctionInstanceById(parseInt(params.funcId));
		}

		if (!func) {
			return new Response('Function not found', { status: 404 });
		}

		// Get function logs
		const logs = await db
			.select()
			.from(functionLogs)
			.where(eq(functionLogs.funcId, func.funcId))
			.orderBy(functionLogs.rowDate);

		return json({
			function: func,
			logs
		});
	} catch (error) {
		console.error('Error fetching function details:', error);
		return new Response('Internal server error', { status: 500 });
	}
}

// Endpoint to update function status
export async function PATCH({ params, request }) {
	const funcId = parseInt(params.funcId);

	if (isNaN(funcId)) {
		return new Response('Invalid function ID', { status: 400 });
	}

	const requestSchema = z.object({
		finished: z.boolean(),
		success: z.boolean(),
		endDate: z.date({ coerce: true }).optional()
	});

	try {
		const data = await request.json();
		const { finished, success, endDate } = requestSchema.parse(JSON.parse(data));

		const [updatedFunc] = await db
			.update(functionProgress)
			.set({
				finished,
				success,
				endDate: endDate ? endDate.toISOString() : undefined
			})
			.where(eq(functionProgress.funcId, funcId))
			.returning();

		return json(updatedFunc);
	} catch (error) {
		console.error('Error updating function:', error);
		return new Response('Internal server error', { status: 500 });
	}
}

// Endpoint to add logs to a function
export async function POST({ params, request }) {
	const funcId = parseInt(params.funcId);

	if (isNaN(funcId)) {
		return new Response('Invalid function ID', { status: 400 });
	}

	try {
		const data = JSON.parse(await request.text());
		let {
			type,
			message = '',
			traceBack = null,
			rowDate = new Date().toISOString()
		} = JSON.parse(data) as {
			type: string;
			message: string;
			traceBack: string | null;
			rowDate: Date;
		};
		rowDate = new Date(rowDate);

		const [log] = await db
			.insert(functionLogs)
			.values({
				funcId,
				type,
				message: message.toString(),
				traceBack,
				rowDate: rowDate ? rowDate.toISOString() : new Date().toISOString()
			})
			.returning();

		return json(log);
	} catch (error) {
		console.error('Error adding log:', error);
		return new Response('Internal server error', { status: 500 });
	}
}
