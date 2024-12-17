import type { ProgressData } from '$lib/types';

export function isProgressData(data: unknown): data is ProgressData {
	if (!data || typeof data !== 'object') return false;
	const d = data as Partial<ProgressData>;
	return (
		typeof d.prog_id === 'string' &&
		typeof d.title === 'string' &&
		typeof d.description === 'string' &&
		typeof d.value === 'number' &&
		typeof d.max === 'number' &&
		(d.duration === undefined || typeof d.duration === 'number') &&
		typeof d.lastUpdated === 'string'
	);
}

export function calculateProgressStats(value: number, max: number) {
	const percentage = (value / max) * 100;
	const completed = percentage >= 100;
	return { percentage, completed };
}
