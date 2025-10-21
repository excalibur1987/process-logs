<script lang="ts">
	interface Props {
		error: Error | string | null;
		onRetry?: () => void;
		context?: string;
	}

	let { error, onRetry, context = 'operation' }: Props = $props();

	const errorMessage = $derived(
		typeof error === 'string' ? error : error?.message || 'An unknown error occurred'
	);
</script>

{#if error}
	<div class="alert alert-error shadow-lg">
		<div>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 flex-shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<div>
				<h3 class="font-bold">Failed to load {context}</h3>
				<div class="text-xs">{errorMessage}</div>
			</div>
		</div>
		{#if onRetry}
			<div class="flex-none">
				<button class="btn btn-ghost btn-sm" onclick={onRetry}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mr-1 h-4 w-4"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
							clip-rule="evenodd"
						/>
					</svg>
					Retry
				</button>
			</div>
		{/if}
	</div>
{/if}
