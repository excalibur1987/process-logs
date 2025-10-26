<script lang="ts">
	import type { PageData } from './$types';
	import FunctionLogs from '$lib/components/FunctionLogs.svelte';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const { function: func, logs } = data;

	// Set up polling for updates
	let intervalId: NodeJS.Timeout;

	onMount(() => {
		// Poll for updates every 10 seconds
		intervalId = setInterval(() => {
			invalidateAll();
		}, 10000);

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});

	$effect(() => {
		// Stop polling when function is finished
		if (func?.finished && intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

<div class="p-4">
	<div class="mb-4 text-base-content/60">
		<div class="flex items-center gap-2">
			<span class="font-semibold">{func?.funcName}</span>
			<span
				class="badge"
				class:badge-info={!func?.finished}
				class:badge-success={func?.finished && func?.success}
				class:badge-error={func?.finished && !func?.success}
			>
				{#if !func?.finished}
					Running
				{:else if func?.success}
					Success
				{:else}
					Failed
				{/if}
			</span>
		</div>
	</div>

	{#if func}
		<FunctionLogs
			{func}
			initialLogs={logs}
			showHeader={false}
			isFinished={func.finished}
			pollingInterval={10000}
			enableExport={false}
			showFilters={false}
		/>
	{/if}
</div>

<style>
	/* Reset styles for embedding */
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		height: 100%;
		background: transparent;
	}
</style>
