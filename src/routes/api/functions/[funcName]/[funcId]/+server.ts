import { db } from '$lib/db';
import { functionLogs, functionProgress } from '$lib/db/schema';
import type { FunctionInstance } from '$lib/db/utils';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils';
import { validateWithContext } from '$lib/utils/zod-error';
import { json } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';

export async function GET({ params, url }) {
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

		// Parse the lastLogDate query parameter
		const requestSchema = z.object({
			lastLogDate: z.string().datetime().optional()
		});

		const { lastLogDate } = validateWithContext(
			requestSchema,
			Object.fromEntries(url.searchParams.entries()),
			'GET /api/functions/[funcName]/[funcId]'
		);

		// Build the query conditions
		const conditions = [eq(functionLogs.funcId, func.funcId)];
		if (lastLogDate) {
			conditions.push(gt(functionLogs.rowDate, lastLogDate));
		}

		// Get function logs
		let logs = await db
			.select()
			.from(functionLogs)
			.where(and(...conditions))
			.orderBy(functionLogs.rowDate);

		return json({
			function: func,
			logs
		});
	} catch (error) {
		console.error('Error fetching function details:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'An unknown error occurred' },
			{ status: 500 }
		);
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
		const { finished, success, endDate } = validateWithContext(
			requestSchema,
			data,
			'PATCH /api/functions/[funcName]/[funcId]'
		);

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
		return json(
			{ error: error instanceof Error ? error.message : 'An unknown error occurred' },
			{ status: 400 }
		);
	}
}

// Endpoint to add logs to a function
export async function POST({ params, request }) {
	let func: FunctionInstance;

	if (parseInt(params.funcId).toString().length !== params.funcId.length) {
		func = await getFunctionInstanceBySlug(params.funcId);
	} else {
		func = await getFunctionInstanceById(parseInt(params.funcId));
	}

	try {
		const data = await request.json();
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

		// Handle progress data
		if (type.toLowerCase() === 'progress') {
			if (typeof message === 'object') {
				message = JSON.stringify(message);
			} else {
				try {
					const parsed = JSON.parse(message);
					message = JSON.stringify(parsed);
				} catch (e) {
					console.error('Invalid progress data JSON', message);
				}
			}
		}

		rowDate = new Date(rowDate);

		const [log] = await db
			.insert(functionLogs)
			.values({
				funcId: func.funcId,
				type,
				message: message,
				traceBack,
				rowDate: rowDate ? rowDate.toISOString() : new Date().toISOString()
			})
			.returning();

		return json(log);
	} catch (error) {
		console.error('Error adding log:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'An unknown error occurred' },
			{ status: 400 }
		);
	}
}
