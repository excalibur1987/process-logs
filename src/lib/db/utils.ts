import { eq } from 'drizzle-orm';
import { db } from '.';
import { functionHeaders, functionProgress } from './schema';

export type FunctionInstance = {
	funcId: number;
	parentId: number | null;
	slug: string | null;
	startDate: string;
	endDate: string | null;
	finished: boolean;
	success: boolean;
	source: string;
	funcName: string;
	headerSlug: string;
	args: any;
};

export async function getFunctionInstanceBySlug(funcSlug: string): Promise<FunctionInstance> {
	const [{ funcId }] = await db
		.select({ funcId: functionProgress.funcId })
		.from(functionProgress)
		.where(eq(functionProgress.slug, funcSlug))
		.execute();
	const funcQuery = db
		.select({
			funcId: functionProgress.funcId,
			parentId: functionProgress.parentId,
			slug: functionProgress.slug,
			startDate: functionProgress.startDate,
			endDate: functionProgress.endDate,
			finished: functionProgress.finished,
			success: functionProgress.success,
			source: functionProgress.source,
			funcName: functionHeaders.funcName,
			headerSlug: functionHeaders.funcSlug,
			args: functionProgress.args
		})
		.from(functionProgress)
		.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
		.where(eq(functionProgress.funcId, funcId));
	const [func] = await funcQuery.execute();
	return func;
}

export async function getFunctionInstanceById(funcId: number): Promise<FunctionInstance> {
	const funcQuery = db
		.select({
			funcId: functionProgress.funcId,
			parentId: functionProgress.parentId,
			slug: functionProgress.slug,
			startDate: functionProgress.startDate,
			endDate: functionProgress.endDate,
			finished: functionProgress.finished,
			success: functionProgress.success,
			source: functionProgress.source,
			funcName: functionHeaders.funcName,
			headerSlug: functionHeaders.funcSlug,
			args: functionProgress.args
		})
		.from(functionProgress)
		.innerJoin(functionHeaders, eq(functionProgress.funcHeaderId, functionHeaders.id))
		.where(eq(functionProgress.funcId, funcId));
	const [func] = await funcQuery.execute();
	return func;
}
