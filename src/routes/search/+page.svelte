<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import SearchSelect from '$lib/components/SearchSelect.svelte';
	import SearchSkeleton from '$lib/components/SearchSkeleton.svelte';
	import FunctionCardSkeleton from '$lib/components/FunctionCardSkeleton.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import type { FunctionHeader } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let selectedFunction = $state<FunctionHeader | undefined>(undefined);
	let currentPage = $state(parseInt(page.url.searchParams.get('page') || '1'));
	let startDate = $state(page.url.searchParams.get('startDate') || data.defaultDates.startDate);
	let endDate = $state(page.url.searchParams.get('endDate') || data.defaultDates.endDate);
	let status = $state(page.url.searchParams.get('status') || 'all');
	let parentOnly = $state(page.url.searchParams.get('parentOnly') === 'true');
	let minDuration = $state(page.url.searchParams.get('minDuration') || '');
	let maxDuration = $state(page.url.searchParams.get('maxDuration') || '');
	let selectedSources = $state<string[]>([]);
	let selectedFuncIds = $state<number[]>([]);
	let searchError = $state<string | null>(null);
	const limit = 10;

	const url = $derived.by(() => new URL(page.url));

	// Function to update URL parameters using SvelteKit's goto
	function updateURL() {
		if (!browser) return;

		const searchParams = new URLSearchParams();

		// Add parameters only if they differ from defaults
		if (currentPage !== 1) {
			searchParams.set('page', currentPage.toString());
		}

		if (startDate !== data.defaultDates.startDate) {
			searchParams.set('startDate', startDate);
		}

		if (endDate !== data.defaultDates.endDate) {
			searchParams.set('endDate', endDate);
		}

		if (status !== 'all') {
			searchParams.set('status', status);
		}

		if (parentOnly) {
			searchParams.set('parentOnly', 'true');
		}

		if (minDuration) {
			searchParams.set('minDuration', minDuration);
		}

		if (maxDuration) {
			searchParams.set('maxDuration', maxDuration);
		}

		if (selectedSources.length > 0) {
			searchParams.set('sources', selectedSources.join(','));
		}

		if (selectedFunction) {
			searchParams.set('funcHeaderId', selectedFunction.id.toString());
			searchParams.set('funcName', selectedFunction.funcName);
			searchParams.set('funcSlug', selectedFunction.funcSlug);
		}

		// Build the new URL
		const newUrl = searchParams.toString()
			? `${page.url.pathname}?${searchParams.toString()}`
			: page.url.pathname;

		// Update URL using SvelteKit's goto with replaceState
		goto(newUrl, { replaceState: true, noScroll: true });
	}

	// Initialize selectedFunction from URL if funcHeaderId exists
	$effect(() => {
		const funcHeaderId = page.url.searchParams.get('funcHeaderId');
		const funcName = page.url.searchParams.get('funcName');
		const funcSlug = page.url.searchParams.get('funcSlug');
		if (funcHeaderId && funcName && funcSlug) {
			selectedFunction = {
				id: parseInt(funcHeaderId),
				funcName,
				funcSlug
			};
		}
	});

	// Initialize selectedSources from URL
	$effect(() => {
		const sourcesParam = page.url.searchParams.get('sources');
		if (sourcesParam) {
			selectedSources = sourcesParam.split(',').filter((s) => s.trim());
		}
	});

	function handlePageChange(newPage: number) {
		currentPage = newPage;
		updateURL();
		// Trigger search with new page
		const form = document.querySelector('form[action="?/search"]') as HTMLFormElement;
		if (form) {
			// Update the hidden page input
			const pageInput = form.querySelector('input[name="page"]') as HTMLInputElement;
			if (pageInput) {
				pageInput.value = newPage.toString();
			}
			// Submit the form
			form.requestSubmit();
		}
	}

	function handleDateChange(event: Event, field: 'startDate' | 'endDate') {
		const value = (event.target as HTMLInputElement).value;
		if (field === 'startDate') {
			startDate = value;
		} else {
			endDate = value;
		}
		updateURL();
	}

	function handleStatusChange(event: Event) {
		status = (event.target as HTMLSelectElement).value;
		updateURL();
	}

	function handleParentOnlyChange(event: Event) {
		parentOnly = (event.target as HTMLInputElement).checked;
		updateURL();
	}

	function handleDurationChange(event: Event, field: 'minDuration' | 'maxDuration') {
		const value = (event.target as HTMLInputElement).value;
		if (field === 'minDuration') {
			minDuration = value;
		} else {
			maxDuration = value;
		}
		updateURL();
	}

	let pagination = $derived(form?.pagination || data.pagination);
	let results = $derived(form?.results || data.results);

	function handleSelectAll(event: Event) {
		const checked = (event.target as HTMLInputElement).checked;
		if (checked) {
			selectedFuncIds = results.filter((func) => !func.finished).map((func) => func.funcId);
		} else {
			selectedFuncIds = [];
		}
	}

	function handleSelectFunction(funcId: number, checked: boolean) {
		if (checked) {
			selectedFuncIds = [...selectedFuncIds, funcId];
		} else {
			selectedFuncIds = selectedFuncIds.filter((id) => id !== funcId);
		}
	}

	$effect(() => {
		// Reset selected functions when page changes or search results update
		selectedFuncIds = [];
	});

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (event.ctrlKey || event.metaKey) {
			switch (event.key) {
				case 'f':
					event.preventDefault();
					// Focus search input
					const searchInput = document.querySelector('input[name="funcName"]') as HTMLInputElement;
					if (searchInput) {
						searchInput.focus();
					}
					break;
			}
		} else if (event.key === 'Escape') {
			// Clear search
			selectedFunction = undefined;
			status = 'all';
			parentOnly = false;
			minDuration = '';
			maxDuration = '';
			selectedSources = [];
		}
	}

	// Add keyboard event listener
	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="p-8">
	<h1 class="mb-8 text-3xl font-bold">Search Functions</h1>

	<form
		method="POST"
		action="?/search"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update({ reset: true });
			};
		}}
	>
		<input type="hidden" name="page" value={currentPage} />
		<input type="hidden" name="limit" value={limit} />

		<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="form-control">
				<label class="label" for="funcName">
					<span class="label-text">Function Name</span>
				</label>
				{#snippet renderOption(selectedFunction: FunctionHeader)}
					<span class="text-sm text-gray-500">
						{selectedFunction.funcName} ({selectedFunction.funcSlug})
					</span>
				{/snippet}
				<input type="hidden" name="funcHeaderId" value={selectedFunction?.id} />
				<input type="hidden" name="funcSlug" value={selectedFunction?.funcSlug} />
				<SearchSelect
					name="funcName"
					placeholder="Search for a function..."
					initialValue={selectedFunction}
					valueKey="funcName"
					endpoint="/api/functions/names"
					pageSize={20}
					optionView={renderOption}
					changeSelected={(item) => (selectedFunction = item)}
				/>
			</div>

			<div class="form-control">
				<label class="label" for="startDate">
					<span class="label-text">Start Date</span>
				</label>
				<input
					type="date"
					name="startDate"
					value={startDate}
					class="input input-bordered"
					onchange={(e) => handleDateChange(e, 'startDate')}
				/>
			</div>

			<div class="form-control">
				<label class="label" for="endDate">
					<span class="label-text">End Date</span>
				</label>
				<input
					type="date"
					name="endDate"
					value={endDate}
					class="input input-bordered"
					onchange={(e) => handleDateChange(e, 'endDate')}
				/>
			</div>

			<div class="form-control">
				<label class="label" for="status">
					<span class="label-text">Status</span>
				</label>
				<select
					id="status"
					name="status"
					class="select select-bordered"
					value={status}
					onchange={handleStatusChange}
				>
					<option value="all">All</option>
					<option value="running">Running</option>
					<option value="success">Success</option>
					<option value="failed">Failed</option>
				</select>
			</div>

			<div class="form-control">
				<label class="label cursor-pointer">
					<span class="label-text">Parent Functions Only</span>
					<input
						type="checkbox"
						name="parentOnly"
						class="checkbox"
						checked={parentOnly}
						onchange={handleParentOnlyChange}
					/>
				</label>
			</div>
		</div>

		<!-- Duration Filters -->
		<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="form-control">
				<label class="label" for="minDuration">
					<span class="label-text">Min Duration (seconds)</span>
				</label>
				<input
					type="number"
					name="minDuration"
					placeholder="0"
					value={minDuration}
					class="input input-bordered"
					min="0"
					step="1"
					onchange={(e) => handleDurationChange(e, 'minDuration')}
				/>
			</div>

			<div class="form-control">
				<label class="label" for="maxDuration">
					<span class="label-text">Max Duration (seconds)</span>
				</label>
				<input
					type="number"
					name="maxDuration"
					placeholder="No limit"
					value={maxDuration}
					class="input input-bordered"
					min="0"
					step="1"
					onchange={(e) => handleDurationChange(e, 'maxDuration')}
				/>
			</div>
		</div>

		<!-- Source Filter -->
		<div class="mb-8">
			<div class="form-control">
				<label class="label">
					<span class="label-text">Sources</span>
					<span class="label-text-alt">Select multiple sources</span>
				</label>
				<div class="dropdown dropdown-hover">
					<button class="btn btn-outline w-full justify-start" tabindex="0">
						{#if selectedSources.length === 0}
							All Sources
						{:else}
							{selectedSources.length} source{selectedSources.length > 1 ? 's' : ''} selected
						{/if}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="ml-auto h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
					<ul class="menu dropdown-content z-50 w-full rounded-box bg-base-100 p-2 shadow">
						{#each data.sources as source}
							<li>
								<label class="label cursor-pointer">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										checked={selectedSources.includes(source)}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											if (target.checked) {
												selectedSources = [...selectedSources, source];
											} else {
												selectedSources = selectedSources.filter((s) => s !== source);
											}
											updateURL();
										}}
									/>
									<span class="label-text ml-2">{source}</span>
								</label>
							</li>
						{/each}
					</ul>
				</div>
				{#each selectedSources as source}
					<input type="hidden" name="sources[]" value={source} />
				{/each}
			</div>
		</div>

		<button
			type="submit"
			class="btn btn-primary relative z-10 mb-8 grid place-items-center"
			style="grid-template-areas: 'stack';"
			disabled={loading}
		>
			<span
				style="grid-area: stack;"
				class="loading loading-spinner col-start-1"
				class:invisible={!loading}
			></span>
			<span style="grid-area: stack;" class="col-start-1" class:invisible={loading}>Search</span>
		</button>
	</form>

	<div class="mb-4 flex items-center justify-between">
		<div>
			{#if selectedFuncIds.length > 0}
				<form
					method="POST"
					action="?/markAsFailed"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							await update();
						};
					}}
				>
					{#each selectedFuncIds as funcId}
						<input type="hidden" name="funcIds[]" value={funcId} />
					{/each}
					<button
						type="submit"
						class="btn btn-error btn-sm grid place-items-center"
						style="grid-template-areas: 'stack';"
						disabled={loading}
					>
						<span
							style="grid-area: stack;"
							class="loading loading-spinner col-start-1"
							class:invisible={!loading}
						></span>
						<span style="grid-area: stack;" class="col-start-1" class:invisible={loading}>
							Mark as Failed
						</span>
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Active Filters Summary -->
	{#if selectedFunction || status !== 'all' || parentOnly || minDuration || maxDuration || selectedSources.length > 0}
		<div class="mb-4">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-sm font-medium text-base-content/60">Active filters:</span>

				{#if selectedFunction}
					<div class="badge badge-primary gap-1">
						Function: {selectedFunction.funcName}
						<button
							class="btn btn-ghost btn-xs"
							onclick={() => {
								selectedFunction = undefined;
								updateURL();
							}}>×</button
						>
					</div>
				{/if}

				{#if status !== 'all'}
					<div class="badge badge-secondary gap-1">
						Status: {status}
						<button
							class="btn btn-ghost btn-xs"
							onclick={() => {
								status = 'all';
								updateURL();
							}}>×</button
						>
					</div>
				{/if}

				{#if parentOnly}
					<div class="badge badge-accent gap-1">
						Parent Only
						<button
							class="btn btn-ghost btn-xs"
							onclick={() => {
								parentOnly = false;
								updateURL();
							}}>×</button
						>
					</div>
				{/if}

				{#if minDuration}
					<div class="badge badge-info gap-1">
						Min Duration: {minDuration}s
						<button
							class="btn btn-ghost btn-xs"
							onclick={() => {
								minDuration = '';
								updateURL();
							}}>×</button
						>
					</div>
				{/if}

				{#if maxDuration}
					<div class="badge badge-info gap-1">
						Max Duration: {maxDuration}s
						<button
							class="btn btn-ghost btn-xs"
							onclick={() => {
								maxDuration = '';
								updateURL();
							}}>×</button
						>
					</div>
				{/if}

				{#each selectedSources as source}
					<div class="badge badge-warning gap-1">
						Source: {source}
						<button
							class="btn btn-ghost btn-xs"
							onclick={() => {
								selectedSources = selectedSources.filter((s) => s !== source);
								updateURL();
							}}>×</button
						>
					</div>
				{/each}

				<button
					class="btn btn-ghost btn-xs"
					onclick={() => {
						selectedFunction = undefined;
						status = 'all';
						parentOnly = false;
						minDuration = '';
						maxDuration = '';
						selectedSources = [];
						updateURL();
					}}>Clear All</button
				>
			</div>
		</div>
	{/if}

	<div class="overflow-x-auto">
		{#if searchError}
			<ErrorBoundary error={searchError} context="search results" />
		{:else if loading}
			<div class="space-y-4">
				{#each Array(limit) as _, i (i)}
					<FunctionCardSkeleton />
				{/each}
			</div>
		{:else}
			<table class="table">
				<thead>
					<tr>
						<th>
							<label>
								<input
									type="checkbox"
									class="checkbox"
									onchange={handleSelectAll}
									checked={selectedFuncIds.length > 0 &&
										selectedFuncIds.length === results.filter((func) => !func.finished).length}
								/>
							</label>
						</th>
						<th>Function Name</th>
						<th>Start Date</th>
						<th>End Date</th>
						<th>Status</th>
						<th>Source</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if results?.length > 0}
						{#each results as func}
							<tr>
								<td>
									<label>
										<input
											type="checkbox"
											class="checkbox"
											disabled={func.finished}
											checked={selectedFuncIds.includes(func.funcId)}
											onchange={(e) =>
												handleSelectFunction(func.funcId, (e.target as HTMLInputElement).checked)}
										/>
									</label>
								</td>
								<td>{func.funcName}</td>
								<td>{new Date(func.startDate).toLocaleString()}</td>
								<td>
									{func.endDate ? new Date(func.endDate).toLocaleString() : '-'}
								</td>
								<td>
									{#if !func.finished}
										<span class="badge badge-info">Running</span>
									{:else if func.success}
										<span class="badge badge-success">Success</span>
									{:else}
										<span class="badge badge-error">Failed</span>
									{/if}
								</td>
								<td>{func.source}</td>
								<td>
									<a href="/functions/{func.funcId}" class="btn btn-sm"> View Details </a>
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan="7" class="py-4 text-center">No results found</td>
						</tr>
					{/if}
				</tbody>
			</table>
		{/if}
	</div>

	{#if pagination && pagination.totalPages > 1}
		<div class="mt-4 flex justify-center gap-2">
			<button
				class="btn btn-sm"
				disabled={currentPage === 1}
				onclick={() => handlePageChange(currentPage - 1)}
			>
				Previous
			</button>

			{#if pagination.totalPages <= 7}
				{#each Array(pagination.totalPages) as _, i}
					<button
						class="btn btn-sm"
						class:btn-primary={currentPage === i + 1}
						onclick={() => handlePageChange(i + 1)}
					>
						{i + 1}
					</button>
				{/each}
			{:else}
				<!-- Always show first page -->
				<button
					class="btn btn-sm"
					class:btn-primary={currentPage === 1}
					onclick={() => handlePageChange(1)}
				>
					1
				</button>

				<!-- Left ellipsis -->
				{#if currentPage > 3}
					<span class="btn btn-disabled btn-sm">...</span>
				{/if}

				<!-- Pages around current page -->
				{#each [-1, 0, 1] as offset}
					{@const pageNum = currentPage + offset}
					{#if pageNum > 1 && pageNum < pagination.totalPages}
						<button
							class="btn btn-sm"
							class:btn-primary={currentPage === pageNum}
							onclick={() => handlePageChange(pageNum)}
						>
							{pageNum}
						</button>
					{/if}
				{/each}

				<!-- Right ellipsis -->
				{#if currentPage < pagination.totalPages - 2}
					<span class="btn btn-disabled btn-sm">...</span>
				{/if}

				<!-- Always show last page -->
				<button
					class="btn btn-sm"
					class:btn-primary={currentPage === pagination.totalPages}
					onclick={() => handlePageChange(pagination.totalPages)}
				>
					{pagination.totalPages}
				</button>
			{/if}

			<button
				class="btn btn-sm"
				disabled={currentPage === pagination.totalPages}
				onclick={() => handlePageChange(currentPage + 1)}
			>
				Next
			</button>
		</div>

		<div class="mt-2 text-center text-sm text-base-content/60">
			{#if pagination.totalCount > 0}
				Showing {(currentPage - 1) * pagination.limit + 1} to {Math.min(
					currentPage * pagination.limit,
					pagination.totalCount
				)} of {pagination.totalCount} results
			{:else}
				No results found
			{/if}
		</div>
	{/if}
</div>
