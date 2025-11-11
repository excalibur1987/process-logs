import { db } from '$lib/db';
import { functionHeaders, functionProgress } from '$lib/db/schema';
import type { FunctionInstance } from '$lib/db/utils.js';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils.js';
import { validateWithContext } from '$lib/utils/zod-error';
import { json } from '@sveltejs/kit';
import * as changeCase from 'change-case';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const requestSchema = z.object({
	funcSlug: z.string(),
	parentId: z.string().nullable().optional(),
	args: z
		.any()
		.optional()
		.transform((data) => {
			if (!data) return {};
			if (typeof data === 'string') return JSON.parse(data);
			return data;
		}),
	source: z.string().optional()
});

export async function POST({ params, request }) {
	try {
		const reqJson = await request.json();
		const { funcSlug, parentId, args, source } = validateWithContext(
			requestSchema,
			reqJson,
			'POST /api/functions/[funcName]/init-function'
		);

		let [funcHeader] = await db
			.select()
			.from(functionHeaders)
			.where(eq(functionHeaders.funcName, changeCase.sentenceCase(params.funcName)));
		if (!funcHeader) {
			await db.insert(functionHeaders).values({
				funcName: changeCase.sentenceCase(params.funcName),
				funcSlug: changeCase.kebabCase(params.funcName)
			});
			[funcHeader] = await db
				.select()
				.from(functionHeaders)
				.where(eq(functionHeaders.funcName, changeCase.sentenceCase(params.funcName)));
		}

		let parentFunction: FunctionInstance | null = null;
		if (parentId) {
			if (parseInt(parentId).toString().length !== parentId.length) {
				parentFunction = await getFunctionInstanceBySlug(parentId);
			} else {
				parentFunction = await getFunctionInstanceById(parseInt(parentId));
			}
		}

		await db.insert(functionProgress).values({
			slug: funcSlug,
			funcHeaderId: funcHeader.id,
			parentId: parentFunction?.funcId ?? null,
			args: args,
			source: source,
			startDate: new Date().toISOString(),
			finished: false,
			success: false
		});
		const funcId = await db
			.select()
			.from(functionProgress)
			.where(eq(functionProgress.slug, funcSlug))
			.then(([result]) => result?.funcId);

		return json({ funcId });
	} catch (error) {
		console.error('Error initializing function:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'An unknown error occurred' },
			{ status: 400 }
		);
	}
}
