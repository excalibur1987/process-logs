import { functionHeaders, functionProgress } from '$lib/db/schema';

import { db } from '$lib/db';
import { json } from '@sveltejs/kit';
import { eq, sql, type InferSelectModel } from 'drizzle-orm';
import { z } from 'zod';

const requestSchema = z.object({
	funcSlug: z.string(),
	parentId: z.number().nullable().optional(),
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

		let parentFunction: InferSelectModel<typeof functionProgress> | null = null;

		if (parentId) {
			const result = await db
				.select()
				.from(functionProgress)
				.where(eq(functionProgress.funcId, parentId));

			if (result.length > 0) {
				parentFunction = result[0];
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
