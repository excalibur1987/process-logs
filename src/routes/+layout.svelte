<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	// Check if we're on an embed page
	let isEmbedPage = page.url.pathname.includes('/embed');
</script>

<div class="drawer lg:drawer-open">
	<input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content">
		{#if !isEmbedPage}
			<div class="navbar bg-base-100 lg:hidden">
				<div class="flex-none">
					<label for="my-drawer-2" class="btn btn-square btn-ghost">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							class="inline-block h-5 w-5 stroke-current"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							></path>
						</svg>
					</label>
				</div>
				<div class="flex-1">
					<a href="/" class="btn btn-ghost text-xl normal-case">Process Logs</a>
				</div>
			</div>
		{/if}

		{@render children?.()}
	</div>
	{#if !isEmbedPage}
		<div class="drawer-side">
			<label for="my-drawer-2" class="drawer-overlay"></label>
			<div class="menu min-h-full w-80 bg-base-200 p-4 text-base-content">
				<div class="mb-8 hidden lg:block">
					<a href="/" class="btn btn-ghost text-xl normal-case">Process Logs</a>
				</div>

				<ul>
					<li>
						<a href="/" class="text-lg" data-sveltekit-reload>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z"
								/>
							</svg>
							Dashboard
						</a>
					</li>
					<li>
						<a href="/search" class="text-lg">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
									clip-rule="evenodd"
								/>
							</svg>
							Search Functions
						</a>
					</li>
				</ul>

				<div class="mt-auto">
					<div class="text-sm opacity-50">
						<p>Version 1.0.0</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
