import { db } from '$lib/db';
import { functionLogs, functionProgress, functionProgressTracking } from '$lib/db/schema';
import type { FunctionInstance } from '$lib/db/utils';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils';
import { json } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
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
		let logs = await db
			.select()
			.from(functionLogs)
			.where(eq(functionLogs.funcId, func.funcId))
			.orderBy(functionLogs.rowDate);
		logs = await Promise.all(
			logs.map(async (log) => {
				if (log.type === 'PROGRESS') {
					const lastProgress = await getLastProgress(func);
					return { ...log, message: JSON.stringify(lastProgress) };
				}
				return log;
			})
		);
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
		if (type.toLowerCase() === 'progress') {
			const progress = await progressLogger(func, message as {});
			if (progress.success) {
				message = progress.progId ?? '';
			} else {
				console.error('Error adding progress log:', progress.message);
				return new Response('Internal server error', { status: 500 });
			}
		}
		rowDate = new Date(rowDate);

		const [log] = await db
			.insert(functionLogs)
			.values({
				funcId: func.funcId,
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

async function getLastProgress(func: FunctionInstance) {
	const lastProgress = await db
		.select({
			prog_id: functionProgressTracking.progId,
			title: functionProgressTracking.title,
			description: functionProgressTracking.description,
			value: functionProgressTracking.currentValue,
			max: functionProgressTracking.maxValue,
			duration: functionProgressTracking.duration
		})
		.from(functionProgressTracking)
		.where(eq(functionProgressTracking.funcId, func.funcId))
		.orderBy(desc(functionProgressTracking.lastUpdated))
		.limit(1);
	return lastProgress[0];
}

async function progressLogger(func: FunctionInstance, message: object) {
	const schema = z.object({
		prog_id: z.string(),
		title: z.string(),
		description: z.string(),
		value: z.number(),
		max: z.number(),
		duration: z.number().optional()
	});
	try {
		const progressData = schema.parse(message);

		let [progress] = await db
			.select()
			.from(functionProgressTracking)
			.where(
				and(
					eq(functionProgressTracking.funcId, func.funcId),
					eq(functionProgressTracking.progId, progressData.prog_id)
				)
			)
			.limit(1);
		if (progress) {
			await db
				.update(functionProgressTracking)
				.set({
					currentValue: progressData.value.toFixed(2),
					lastUpdated: new Date().toISOString()
				})
				.where(eq(functionProgressTracking.id, progress.id));
		} else {
			await db.insert(functionProgressTracking).values({
				funcId: func.funcId,
				progId: progressData.prog_id,
				title: progressData.title,
				description: progressData.description,
				currentValue: progressData.value.toFixed(2),
				maxValue: progressData.max.toFixed(2),
				duration: progressData.duration?.toFixed(2),
				lastUpdated: new Date().toISOString(),
				completed: progressData.value >= progressData.max
			});
		}

		return {
			success: true,
			progId: progressData.prog_id
		};
	} catch (error) {
		console.error('Error updating progress:', error);
		return {
			success: false,
			progId: null,
			message: 'Internal server error'
		};
	}
}
