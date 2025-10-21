<script lang="ts">
	import { onMount } from 'svelte';
	import type { FunctionLog, ProgressData } from '$lib/types';
	import type { FunctionInstance } from '$lib/db/utils';
	import { calculateProgressStats } from '$lib/utils/progress';

	interface Props {
		func: FunctionInstance;
		initialLogs?: Promise<FunctionLog[]>;
		showHeader?: boolean;
		isFinished: boolean;
		pollingInterval?: number;
		enableExport?: boolean;
		showFilters?: boolean;
	}

	let {
		func,
		initialLogs,
		showHeader = false,
		pollingInterval,
		enableExport = false,
		showFilters = true
	}: Props = $props();

	let logs = $state<FunctionLog[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let funcFinished = $state(func?.finished);
	let funcId = $state(func?.funcId);
	let funcSlug = $state(func?.headerSlug);
	let lastLogDate = $state<string | null>(null);

	// Filtering state
	let searchQuery = $state('');
	let selectedLogTypes = $state<Set<string>>(
		new Set(['INFO', 'ERROR', 'WARNING', 'SUCCESS', 'FINAL'])
	);
	let timeRangeStart = $state<string>('');
	let timeRangeEnd = $state<string>('');
	let showFiltersUI = $state(false);

	// Available log types
	const logTypes = ['INFO', 'ERROR', 'WARNING', 'SUCCESS', 'FINAL', 'PROGRESS', 'CALLBACK', 'HTML'];

	// Filtered logs
	let filteredLogs = $derived.by(() => {
		// If filters are disabled, show all logs
		if (!showFilters) {
			return logs;
		}

		let filtered = logs;

		// Filter by log type
		if (selectedLogTypes.size < logTypes.length) {
			filtered = filtered.filter((log) => selectedLogTypes.has(log.type?.toUpperCase()));
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(log) =>
					(typeof log.message === 'string' ? log.message.toLowerCase() : '').includes(query) ||
					(log.traceBack?.toLowerCase() || '').includes(query)
			);
		}

		// Filter by time range
		if (timeRangeStart) {
			const startTime = new Date(timeRangeStart).getTime();
			filtered = filtered.filter((log) => new Date(log.rowDate).getTime() >= startTime);
		}
		if (timeRangeEnd) {
			const endTime = new Date(timeRangeEnd).getTime();
			filtered = filtered.filter((log) => new Date(log.rowDate).getTime() <= endTime);
		}

		return filtered;
	});

	// Highlight search text in message
	function highlightText(text: string, query: string): string {
		if (!query.trim()) return text;
		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
	}

	// Track progress states by function ID
	interface ProgressState {
		progId: string;
		title: string;
		description: string;
		value: number;
		max: number;
		duration?: number;
		startDate: Date;
		lastUpdated: Date;
		completed: boolean;
		percentage: number;
	}

	let progressStatesByFunc = $state<Record<number, Record<string, ProgressState>>>({});

	function updateProgressState(accumulatedLog: typeof progressStatesByFunc, log: FunctionLog) {
		if (log.type !== 'PROGRESS') return accumulatedLog;

		try {
			const data = typeof log.message === 'string' ? JSON.parse(log.message) : log.message;

			const { percentage, completed } = calculateProgressStats(data.value, data.max);
			const progId = data?.progress_id ?? data?.['prog_id'] ?? '';
			accumulatedLog = {
				...accumulatedLog,
				[log.funcId]: {
					...accumulatedLog[log.funcId],
					[progId]: {
						progId,
						title: accumulatedLog?.[log.funcId]?.[progId]?.title ?? data.title,
						description: accumulatedLog?.[log.funcId]?.[progId]?.description ?? data.description,
						value: data.value,
						max: accumulatedLog?.[log.funcId]?.[progId]?.max ?? data.max,
						duration:
							(new Date(log.rowDate).getTime() -
								new Date(
									accumulatedLog?.[log.funcId]?.[progId]?.startDate ?? log.rowDate ?? new Date()
								).getTime()) /
							1000,
						startDate: new Date(accumulatedLog?.[log.funcId]?.[progId]?.startDate ?? log.rowDate),
						lastUpdated: new Date(
							accumulatedLog?.[log.funcId]?.[progId]?.lastUpdated ?? log.rowDate
						),
						completed,
						percentage
					}
				}
			};

			return accumulatedLog;
		} catch (e) {
			console.error('Failed to update progress state:', e);
		}
		return accumulatedLog;
	}

	let currentTime = $state(new Date());

	$effect(() => {
		setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});

	// Update progress state when new logs come in
	$effect(() => {
		progressStatesByFunc = logs.reduce(updateProgressState, {} as typeof progressStatesByFunc);
	});

	let logsContainer = $state<HTMLDivElement | null>(null);
	let intervalId = $state<NodeJS.Timeout | undefined>(undefined);

	// Initialize logs and set initial lastLogDate
	if (initialLogs) {
		initialLogs
			.then((loadedLogs) => {
				logs = loadedLogs;
				loading = false;
				if (logs.length > 0) {
					lastLogDate = logs[logs.length - 1].rowDate;
				}
			})
			.catch((err) => {
				error = err instanceof Error ? err.message : 'Failed to load logs';
				loading = false;
			});
	}

	async function checkFunctionStatus() {
		try {
			const response = await fetch(`/api/functions/${funcId}/logs`);
			if (!response.ok) throw new Error('Failed to fetch function status');
			const { function: updatedFunc } = await response.json();
			funcFinished = updatedFunc?.finished ?? false;
			return funcFinished;
		} catch (err) {
			console.error('Error checking function status:', err);
			return false;
		}
	}

	async function fetchLogs() {
		// Check if function is finished first
		const isFinished = await checkFunctionStatus();
		if (isFinished) {
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = undefined;
			}
			return;
		}

		loading = true;
		error = null;
		try {
			// Only fetch new logs after the last known log date
			const url = new URL(`/api/functions/${funcId}/logs`, window.location.origin);
			if (lastLogDate) {
				url.searchParams.set('lastLogDate', lastLogDate);
			}
			const response = await fetch(url);
			if (!response.ok) throw new Error('Failed to fetch logs');
			const { logs: newLogs } = await response.json();

			// Update lastLogDate and append new logs if we received any
			if (newLogs?.length > 0) {
				lastLogDate = newLogs[newLogs.length - 1].rowDate;
				logs = [...logs, ...newLogs];
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch logs';
		} finally {
			loading = false;
		}
	}

	// Export functionality
	async function exportLogs(format: 'csv' | 'json' | 'txt') {
		try {
			const params = new URLSearchParams({
				format,
				...(searchQuery && { search: searchQuery }),
				...(timeRangeStart && { startTime: timeRangeStart }),
				...(timeRangeEnd && { endTime: timeRangeEnd }),
				...(selectedLogTypes.size < logTypes.length && {
					types: Array.from(selectedLogTypes).join(',')
				})
			});

			const response = await fetch(`/api/functions/${funcId}/logs/export?${params}`);
			if (!response.ok) throw new Error('Export failed');

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `logs-${func.funcName}-${new Date().toISOString().split('T')[0]}.${format}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Export failed:', err);
			error = 'Failed to export logs';
		}
	}

	// Setup polling interval
	onMount(() => {
		// Initial fetch if no initialLogs provided
		if (!initialLogs) {
			fetchLogs();
		}

		// Setup polling if not finished
		if (pollingInterval && !funcFinished) {
			intervalId = setInterval(fetchLogs, pollingInterval);
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});
</script>

<div class="space-y-4">
	<!-- Export Controls -->
	{#if enableExport && !showFilters}
		<div class="card bg-base-100 p-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold">Export Logs</h3>
				<div class="dropdown dropdown-end">
					<button class="btn btn-outline btn-sm" tabindex="0">
						Export
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
					<ul class="menu dropdown-content z-50 w-52 rounded-box bg-base-100 p-2 shadow">
						<li><button onclick={() => exportLogs('csv')}>Export as CSV</button></li>
						<li><button onclick={() => exportLogs('json')}>Export as JSON</button></li>
						<li><button onclick={() => exportLogs('txt')}>Export as TXT</button></li>
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<!-- Filter Controls -->
	{#if showFilters}
		<div class="card bg-base-100 p-4">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Log Filters</h3>
				<div class="flex items-center gap-2">
					{#if !funcFinished}
						<span class="badge badge-info gap-1">
							<span class="loading loading-dots loading-xs"></span>
							Auto-refreshing
						</span>
					{/if}
					<button class="btn btn-ghost btn-sm" onclick={fetchLogs}>
						<span class="sr-only">Refresh</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
					{#if enableExport}
						<div class="dropdown dropdown-end">
							<button class="btn btn-outline btn-sm" tabindex="0">
								Export
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
							<ul class="menu dropdown-content z-50 w-52 rounded-box bg-base-100 p-2 shadow">
								<li><button onclick={() => exportLogs('csv')}>Export as CSV</button></li>
								<li><button onclick={() => exportLogs('json')}>Export as JSON</button></li>
								<li><button onclick={() => exportLogs('txt')}>Export as TXT</button></li>
							</ul>
						</div>
					{/if}
				</div>
			</div>

			<!-- Search Input -->
			<div class="form-control mb-4">
				<label class="label">
					<span class="label-text">Search in logs</span>
					<span class="label-text-alt">{filteredLogs.length} of {logs.length} logs</span>
				</label>
				<input
					type="text"
					placeholder="Search log messages..."
					class="input input-bordered"
					bind:value={searchQuery}
				/>
			</div>

			<!-- Log Type Filters -->
			<div class="form-control mb-4">
				<label class="label">
					<span class="label-text">Log Types</span>
					<button
						class="btn btn-ghost btn-xs"
						onclick={() => (selectedLogTypes = new Set(logTypes))}>Select All</button
					>
				</label>
				<div class="flex flex-wrap gap-2">
					{#each logTypes as logType}
						<label class="label cursor-pointer">
							<input
								type="checkbox"
								class="checkbox checkbox-sm"
								checked={selectedLogTypes.has(logType)}
								onchange={(e) => {
									const target = e.target as HTMLInputElement;
									if (target.checked) {
										selectedLogTypes.add(logType);
									} else {
										selectedLogTypes.delete(logType);
									}
									selectedLogTypes = new Set(selectedLogTypes);
								}}
							/>
							<span class="label-text ml-2">{logType}</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Time Range Filters -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="form-control">
					<label class="label">
						<span class="label-text">Start Time</span>
					</label>
					<input type="datetime-local" class="input input-bordered" bind:value={timeRangeStart} />
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text">End Time</span>
					</label>
					<input type="datetime-local" class="input input-bordered" bind:value={timeRangeEnd} />
				</div>
			</div>
		</div>
	{/if}

	<!-- Logs Container -->
	<div class="max-h-[600px] space-y-4 overflow-y-auto pr-2" bind:this={logsContainer}>
		{#if loading && !logs?.length}
			<div class="flex justify-center p-8">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{:else if error}
			<div class="alert alert-error">
				<span>{error}</span>
				<button class="btn btn-sm" onclick={fetchLogs}>Retry</button>
			</div>
		{:else if logs?.length === 0}
			<div class="p-8 text-center text-base-content/60">
				<div class="space-y-2">
					<p>No logs found for this function</p>
					<p class="text-sm">Logs will appear here as the function executes</p>
				</div>
			</div>
		{:else if filteredLogs.length === 0}
			<div class="p-8 text-center text-base-content/60">
				<div class="space-y-2">
					<p>No logs match your current filters</p>
					<p class="text-sm">Try adjusting your search criteria or clearing filters</p>
					<button
						class="btn btn-outline btn-sm"
						onclick={() => {
							searchQuery = '';
							selectedLogTypes = new Set(logTypes);
							timeRangeStart = '';
							timeRangeEnd = '';
						}}>Clear All Filters</button
					>
				</div>
			</div>
		{:else}
			<!-- Progress Bars Section -->
			{#each Object.entries(progressStatesByFunc) as [funcId, progressStates]}
				{#if Object.keys(progressStates)?.length > 0}
					<div class="mb-6 space-y-4 rounded-lg bg-base-200 p-4">
						{#if parseInt(funcId) !== func.funcId}
							<div class="mb-2">
								<span class="badge badge-ghost gap-1">
									{logs?.find((l) => l.funcId === parseInt(funcId))?.function?.funcName}
								</span>
							</div>
						{/if}
						{#each Object.entries(progressStates) as [progId, progress]}
							<div class="card bg-base-100 p-4">
								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<div>
											<div class="font-medium">{progress.title || progress.description}</div>
										</div>
										<div class="text-sm font-medium">
											{#if !progress.completed && !func.finished}
												<div class="text-sm text-base-content/60">
													{Math.ceil((currentTime.getTime() - progress.startDate.getTime()) / 1000)}
													seconds
												</div>
											{:else}
												<div class="text-sm text-base-content/60">
													{Math.ceil(progress.duration ?? 0)} seconds
												</div>
											{/if}
											<div class="text-sm text-base-content/60">
												{Math.round(progress.percentage)}% ({progress.value} / {progress.max})
											</div>
										</div>
									</div>
									<div class="w-full">
										<progress
											class="progress w-full"
											class:progress-primary={!progress.completed}
											class:progress-success={progress.completed}
											value={progress.value}
											max={progress.max}
										></progress>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/each}

			<!-- Logs Section -->
			<div class="space-y-4">
				{#each filteredLogs as log}
					{@const type = log.type?.toUpperCase()}
					{#if !['PROGRESS', 'CALLBACK', 'HTML'].includes(type)}
						<div
							class="card border-l-4 bg-base-100 transition-all hover:translate-x-1"
							class:border-info={type === 'INFO'}
							class:border-success={type === 'SUCCESS' || type === 'FINAL'}
							class:border-warning={type === 'WARNING'}
							class:border-error={type === 'ERROR'}
							class:border-primary={!['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'FINAL'].includes(
								type
							)}
							class:ml-8={log.funcId !== func.funcId}
						>
							<div class="card-body p-4">
								<div class="flex items-center gap-4">
									<!-- Function Name (for child functions) -->
									{#if log.funcId !== func.funcId}
										<span class="badge badge-ghost gap-1">
											{log.function?.funcName}
										</span>
									{/if}

									<!-- Timestamp -->
									<span class="font-mono text-sm text-base-content/60">
										{new Date(log.rowDate).toLocaleString()}
									</span>

									<!-- Log Type Badge -->
									<span
										class="badge gap-1"
										class:badge-info={type === 'INFO'}
										class:badge-success={type === 'SUCCESS' || type === 'FINAL'}
										class:badge-warning={type === 'WARNING'}
										class:badge-error={type === 'ERROR'}
										class:badge-primary={!['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'FINAL'].includes(
											type
										)}
									>
										{type}
									</span>
								</div>

								<!-- Message -->
								<div class="mt-2 whitespace-pre-wrap font-mono text-sm">
									{@html highlightText(
										typeof log.message === 'string' ? log.message : '',
										searchQuery
									)}
								</div>

								<!-- Traceback if exists -->
								{#if log.traceBack}
									<div class="mt-4">
										<div class="collapse bg-base-200">
											<input type="checkbox" />
											<div class="collapse-title font-medium">Show Traceback</div>
											<div class="collapse-content">
												<pre class="whitespace-pre-wrap text-sm">{log.traceBack}</pre>
											</div>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
