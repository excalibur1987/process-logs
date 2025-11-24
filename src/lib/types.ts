import type { functionHeaders, functionProgress } from './db/schema';

export type FunctionProgress = typeof functionProgress.$inferSelect;
export type FunctionHeader = typeof functionHeaders.$inferSelect;

export interface ProgressData {
	progress_id: string;
	title: string;
	description: string;
	unit: string;
	postfix: string;
	value: number;
	max: number;
	duration?: number;
	lastUpdated: string;
}

export type FunctionLogType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'PROGRESS' | 'FINAL';

export interface FunctionLog {
	id: number;
	funcId: number;
	type: FunctionLogType;
	message: string | ProgressData;
	traceBack: string | null;
	rowDate: string;
	function?: {
		funcId: number;
		funcName: string;
		funcSlug: string;
		parentId: number | null;
	};
}
