<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const { function: func } = data;

	interface ProgressItem {
		id: number;
		funcId: number;
		progId: string;
		title: string;
		description: string;
		currentValue: number;
		maxValue: number;
		duration?: number;
		lastUpdated: string;
		completed: boolean;
		percentage: number;
	}

	let progress = $state<ProgressItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let intervalId = $state<NodeJS.Timeout | undefined>(undefined);

	// Initialize progress from server data
	$effect(() => {
		if (data.progress) {
			data.progress.then((result) => {
				progress = result.progress;
				loading = false;
			});
		}
	});

	async function fetchProgress() {
		try {
			const url = new URL(window.location.href);
			const progressId = url.searchParams.get('progressId');
			const response = await fetch(
				`/api/functions/${func.funcId}/logs/progress${progressId ? `?progressId=${progressId}` : ''}`
			);
			if (!response.ok) throw new Error('Failed to fetch progress');
			const result = await response.json();
			progress = result.progress;

			// If all progress items are completed, stop polling
			if (progress.every((p) => p.completed)) {
				clearInterval(intervalId);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch progress';
			clearInterval(intervalId);
		}
	}

	onMount(() => {
		// Start polling if any progress is not completed
		if (progress.some((p) => !p.completed)) {
			intervalId = setInterval(fetchProgress, 1000);
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});
</script>

<div class="container mx-auto p-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Progress Tracking</h1>
			<div class="mt-2 text-base-content/60">
				<span class="font-semibold">{func.funcName}</span>
				<span class="mx-2">•</span>
				<span>{func.headerSlug}</span>
			</div>
		</div>

		<div class="flex gap-2">
			<button class="btn" onclick={fetchProgress}>Refresh</button>
			<a href="/functions/{func.funcId}/logs" class="btn">View Logs</a>
			<a href="/functions/{func.funcId}" class="btn">View Details</a>
		</div>
	</div>

	{#if loading && !progress.length}
		<div class="flex justify-center p-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span>{error}</span>
			<button class="btn btn-sm" onclick={fetchProgress}>Retry</button>
		</div>
	{:else if progress.length === 0}
		<div class="p-8 text-center text-base-content/60">No progress tracking found</div>
	{:else}
		<div class="grid grid-cols-1 gap-6">
			{#each progress as item}
				<div class="card bg-base-200">
					<div class="card-body">
						<div class="flex items-start justify-between">
							<div>
								<h2 class="card-title">{item.title}</h2>
								<p class="mt-1 text-base-content/70">{item.description}</p>
							</div>
							<div class="flex items-center gap-2">
								<span
									class="badge"
									class:badge-success={item.completed}
									class:badge-info={!item.completed}
								>
									{item.completed ? 'Completed' : 'In Progress'}
								</span>
								<span class="badge badge-neutral">
									{Math.round(item.percentage)}%
								</span>
							</div>
						</div>

						<div class="mt-4">
							<div class="mb-2 flex items-center justify-between text-sm">
								<span>Progress</span>
								<span>{item.currentValue} / {item.maxValue}</span>
							</div>
							<progress
								class="progress w-full"
								class:progress-success={item.completed}
								class:progress-primary={!item.completed}
								value={item.currentValue}
								max={item.maxValue}
							></progress>
						</div>

						<div class="mt-4 flex items-center justify-between text-sm text-base-content/60">
							<div>
								{#if item.duration && !item.completed}
									<span>Estimated time remaining: {Math.ceil(item.duration)} seconds</span>
								{/if}
							</div>
							<div>Last updated: {new Date(item.lastUpdated).toLocaleString()}</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
