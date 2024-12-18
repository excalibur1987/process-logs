export function calculateProgressStats(value: number, max: number) {
	const percentage = (value / max) * 100;
	const completed = percentage >= 100;
	return { percentage, completed };
}
