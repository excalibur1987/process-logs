import { functionHeaders, functionProgress } from '$lib/db/schema';

import { db } from '$lib/db';
import type { FunctionInstance } from '$lib/db/utils.js';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils.js';
import { json } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
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
	source: z.string()
});

export async function POST({ params, request }) {
	try {
		const reqJson = await request.json();

		const parsed = requestSchema.parse(JSON.parse(reqJson));
		const { funcSlug, parentId, args, source } = parsed;

		const [funcHeader] = await db
			.select()
			.from(functionHeaders)
			.where(eq(sql<string>`slugify(${functionHeaders.funcName})`, params.funcName));
		if (!funcHeader) {
			return json({ error: 'Function not found' }, { status: 404 });
		}

		let parentFunction: FunctionInstance | null = null;
		if (parentId) {
			if (parseInt(parentId).toString().length !== parentId.length) {
				parentFunction = await getFunctionInstanceBySlug(parentId);
			} else {
				parentFunction = await getFunctionInstanceById(parseInt(parentId));
			}
		}

		const [{ funcId }] = await db
			.insert(functionProgress)
			.values({
				slug: funcSlug,
				funcHeaderId: funcHeader.id,
				parentId: parentFunction?.funcId ?? null,
				args: args,
				source: source,
				startDate: new Date().toISOString(),
				finished: false,
				success: false
			})
			.returning({ funcId: functionProgress.funcId });

		return json({ funcId });
	} catch (error) {
		return json({ error: (error as Error).message }, { status: 400 });
	}
}
