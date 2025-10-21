import { db } from '$lib/db';
import { functionProgress } from '$lib/db/schema';
import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';

export async function GET() {
	try {
		const sources = await db
			.selectDistinct({
				source: functionProgress.source
			})
			.from(functionProgress)
			.where(sql`${functionProgress.source} != ''`)
			.orderBy(functionProgress.source);

		return json(sources.map((s) => s.source));
	} catch (error) {
		console.error('Error fetching sources:', error);
		return new Response('Internal server error', { status: 500 });
	}
}
