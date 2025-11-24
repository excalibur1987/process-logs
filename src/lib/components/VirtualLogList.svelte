<script lang="ts">
	import type { FunctionLog, ProgressData } from '$lib/types';
	import { calculateProgressStats } from '$lib/utils/progress';

	interface Props {
		logs: FunctionLog[];
		itemHeight?: number;
		containerHeight?: number;
		searchQuery?: string;
	}

	let { logs, itemHeight = 80, containerHeight = 600, searchQuery = '' }: Props = $props();

	let scrollTop = $state(0);
	let containerRef: HTMLDivElement;

	// Track which progress IDs we've already shown to avoid duplicates
	let shownProgressIds = $state(new Set<string>());

	// Process logs and add progress bars inline
	const processedLogs = $derived.by(() => {
		const processed: Array<
			FunctionLog | { type: 'PROGRESS_BAR'; data: any; timestamp: string; id: string }
		> = [];
		const progressMap = new Map<string, { data: any; timestamp: string; logIndex: number }>();

		// First pass: collect all progress data and find the latest values for each progress ID
		logs.forEach((log, index) => {
			if (log.type === 'PROGRESS') {
				let data: ProgressData;

				// Handle both string and object message types
				if (typeof log.message === 'string') {
					try {
						data = JSON.parse(log.message);
					} catch (e) {
						return; // Skip if not valid JSON
					}
				} else {
					data = log.message as ProgressData;
				}

				const progId = data?.progress_id ?? (data as any)?.['prog_id'] ?? '';

				if (progId) {
					// Store the latest progress data for this ID
					const savedProgress = progressMap.get(progId);
					progressMap.set(progId, {
						data: {
							progId,
							title: savedProgress?.data?.title ?? data?.title,
							description: savedProgress?.data?.description ?? data?.description,
							postfix: savedProgress?.data?.postfix ?? data.postfix,
							unit: savedProgress?.data?.unit ?? data.unit,
							value: data.value,
							max: data.max,
							percentage: calculateProgressStats(data.value, data.max).percentage,
							completed: calculateProgressStats(data.value, data.max).completed,
							startDate: new Date(log.rowDate)
						},
						timestamp: log.rowDate,
						logIndex: index
					});
				}
			}
		});

		// Second pass: build the processed array with progress bars at their first occurrence
		const shownProgressIds = new Set<string>();

		logs.forEach((log, index) => {
			if (log.type === 'PROGRESS') {
				let data: ProgressData;

				// Handle both string and object message types
				if (typeof log.message === 'string') {
					try {
						data = JSON.parse(log.message);
					} catch (e) {
						return; // Skip if not valid JSON
					}
				} else {
					data = log.message as ProgressData;
				}

				const progId = data?.progress_id ?? (data as any)?.['prog_id'] ?? '';

				// Show progress bar only at the first occurrence, but with latest data
				if (progId && !shownProgressIds.has(progId)) {
					shownProgressIds.add(progId);
					const latestProgress = progressMap.get(progId);
					if (latestProgress) {
						processed.push({
							type: 'PROGRESS_BAR',
							data: latestProgress.data,
							timestamp: latestProgress.timestamp,
							id: `progress-${progId}`
						});
					}
				}
			} else {
				// Add regular log entries
				processed.push(log);
			}
		});

		return processed;
	});

	const visibleStart = $derived(Math.max(0, Math.floor(scrollTop / itemHeight) - 2));
	const visibleCount = $derived(Math.ceil(containerHeight / itemHeight) + 4);
	const visibleEnd = $derived(Math.min(visibleStart + visibleCount, processedLogs.length));
	const visibleLogs = $derived(processedLogs.slice(visibleStart, visibleEnd));
	const totalHeight = $derived(processedLogs.length * itemHeight);
	const offsetY = $derived(visibleStart * itemHeight);

	function handleScroll(e: Event) {
		scrollTop = (e.target as HTMLDivElement).scrollTop;
	}

	function highlightText(text: string, query: string): string {
		if (!query.trim()) return text;
		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
	}
</script>

<div
	bind:this={containerRef}
	class="overflow-auto rounded-lg border border-base-300"
	style="height: {containerHeight}px"
	onscroll={handleScroll}
>
	<div style="height: {totalHeight}px; position: relative;">
		<div style="transform: translateY({offsetY}px);">
			{#each visibleLogs as item, i (item.id || visibleStart + i)}
				{#if item.type === 'PROGRESS_BAR'}
					<!-- Progress Bar -->
					<div class="mb-4 rounded-lg bg-base-200 p-4" style="height: {itemHeight}px">
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<div>
									<div class="font-medium">{item.data.title} ({item.data.description})</div>
								</div>
								<div class="text-sm font-medium">
									<div class="flex gap-2 text-sm text-base-content/60">
										<span
											>{Math.round(item.data.percentage)}% ({item.data.value} / {item.data.max}) {item
												.data.unit}</span
										>
										{#if item.data.postfix}
											<span> {item.data.postfix}</span>
										{/if}
									</div>
								</div>
							</div>
							<div class="w-full">
								<progress
									class="progress w-full"
									class:progress-primary={!item.data.completed}
									class:progress-success={item.data.completed}
									value={item.data.value}
									max={item.data.max}
								></progress>
							</div>
						</div>
					</div>
				{:else}
					<!-- Regular Log Entry -->
					<div
						class="flex items-start gap-3 border-b border-base-300 bg-base-100 p-3 hover:bg-base-200"
						style="height: {itemHeight}px"
					>
						<div class="flex-shrink-0 text-xs text-base-content/60">
							{new Date(item.rowDate).toLocaleString()}
						</div>
						<div class="flex-shrink-0">
							<span
								class="badge badge-sm"
								class:badge-info={item.type === 'INFO'}
								class:badge-error={item.type === 'ERROR'}
								class:badge-warning={item.type === 'WARNING'}
								class:badge-success={item.type === 'SUCCESS'}
								class:badge-primary={item.type === 'FINAL'}
							>
								{item.type}
							</span>
						</div>
						<div class="flex-1 overflow-hidden text-sm">
							{@html highlightText(
								typeof item.message === 'string' ? item.message : '',
								searchQuery
							)}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>
