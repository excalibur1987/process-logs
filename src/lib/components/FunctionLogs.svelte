<script lang="ts">
	import { onMount } from 'svelte';
	import type { FunctionLog } from '$lib/types';
	import type { FunctionInstance } from '$lib/db/utils';

	interface Props {
		func: FunctionInstance;
		initialLogs?: Promise<FunctionLog[]>;
		showHeader?: boolean;
		isFinished: boolean;
		pollingInterval?: number;
	}

	let { func, initialLogs, showHeader = false, pollingInterval }: Props = $props();

	let logs = $state<
		(FunctionLog & {
			function?: { funcId: number; funcName: string; funcSlug: string; parentId: number | null };
			progress?: {
				prog_id: string;
				title: string;
				description: string;
				value: number;
				max: number;
				duration?: number;
				completed: boolean;
				lastUpdated: string;
			} | null;
		})[]
	>([]);
	let loading = $state(!initialLogs);
	let error = $state<string | null>(null);
	let funcFinished = $state(func?.finished);
	let funcId = $state(func?.funcId);
	let funcSlug = $state(func?.headerSlug);
	let lastLogDate = $state<string | null>(null);

	// Track progress states by function ID
	interface ProgressState {
		progId: string;
		title: string;
		description: string;
		value: number;
		max: number;
		duration?: number;
		lastUpdated: Date;
	}

	let progressStatesByFunc = $state<Record<number, Record<string, ProgressState>>>({});

	// Update progress state when new logs come in
	$effect(() => {
		logs.forEach((log) => {
			if (log.type === 'PROGRESS' && log.progress) {
				try {
					const progressData = log.progress;
					console.log(
						'🚀 ~ file: FunctionLogs.svelte:74 ~ logs.forEach ~ progressData:',
						progressData
					);
					if (!progressStatesByFunc[log.funcId]) {
						progressStatesByFunc[log.funcId] = {};
					}
					progressStatesByFunc[log.funcId][progressData.prog_id] = {
						progId: progressData.prog_id,
						title: progressData.title,
						description: progressData.description,
						value: progressData.value,
						max: progressData.max,
						duration: progressData.duration,
						lastUpdated: new Date(progressData.lastUpdated)
					};
				} catch (e) {
					console.error('Failed to parse progress data:', e);
				}
			}
		});
	});

	let logsContainer = $state<HTMLDivElement | null>(null);
	let intervalId = $state<NodeJS.Timeout | undefined>(undefined);

	// Initialize logs and set initial lastLogDate
	if (initialLogs) {
		initialLogs.then((loadedLogs) => {
			logs = loadedLogs;
			if (logs.length > 0) {
				lastLogDate = logs[logs.length - 1].rowDate;
			}
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

<div class="max-h-[600px] space-y-4 overflow-y-auto pr-2" bind:this={logsContainer}>
	{#if showHeader}
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-2xl font-bold">Function Logs</h2>
			<div class="flex items-center gap-2">
				{#if !funcFinished}
					<span class="badge badge-info gap-1">
						<span class="loading loading-dots loading-xs"></span>
						Auto-refreshing
					</span>
				{/if}
				<button class="btn btn-ghost btn-sm" onclick={fetchLogs}>
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
					<span class="ml-2">Refresh</span>
				</button>
			</div>
		</div>
	{/if}

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
		<div class="p-8 text-center text-base-content/60">No logs found for this function</div>
	{:else}
		<!-- Progress Bars Section -->
		{#each Object.entries(progressStatesByFunc) as [funcId, progressStates]}
			{#if Object.keys(progressStates)?.length > 0}
				<div class="mb-6 space-y-4 rounded-lg bg-base-200 p-4">
					<div class="mb-2 flex items-center justify-between">
						<div>
							<h3 class="font-semibold">
								Progress Tracking - {logs?.find((l) => l.funcId === parseInt(funcId))?.function
									?.funcName}
							</h3>
							{#if parseInt(funcId) !== func.funcId}
								<div class="text-sm text-base-content/70">Child Function</div>
							{/if}
						</div>
						<a
							href="/functions/{funcId}/logs/progress"
							class="btn btn-ghost btn-sm"
							data-sveltekit-reload
						>
							View All Progress
						</a>
					</div>
					{#each Object.entries(progressStates) as [progId, progress]}
						<a
							href="/functions/{funcId}/logs/progress?progressId={progId}"
							class="block rounded-lg transition-colors hover:bg-base-300"
							data-sveltekit-reload
						>
							<div class="space-y-2 p-2">
								<div class="flex items-center justify-between">
									<div>
										<div class="font-medium">{progress.title}</div>
										<div class="text-sm text-base-content/70">{progress.description}</div>
									</div>
									<div class="text-sm font-medium">
										{Math.round((progress.value / progress.max) * 100)}%
									</div>
								</div>
								<div class="w-full">
									<progress
										class="progress progress-primary w-full"
										value={progress.value}
										max={progress.max}
									></progress>
								</div>
								{#if progress.duration}
									<div class="text-xs text-base-content/60">
										Estimated time remaining: {Math.ceil(progress.duration)} seconds
									</div>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		{/each}

		<!-- Logs Section -->
		<div class="space-y-4">
			{#each logs as log}
				{@const type = log.type?.toUpperCase()}
				{#if type !== 'PROGRESS'}
					<div
						class="card border-l-4 bg-base-100 transition-all hover:translate-x-1"
						class:border-info={type === 'INFO'}
						class:border-success={type === 'SUCCESS' || type === 'FINAL'}
						class:border-warning={type === 'WARNING'}
						class:border-error={type === 'ERROR'}
						class:border-primary={!['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'FINAL'].includes(type)}
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
							<div class="mt-2 whitespace-pre-wrap font-mono text-sm">{log.message}</div>

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
