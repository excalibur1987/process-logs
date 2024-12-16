<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import SearchSelect from '$lib/components/SearchSelect.svelte';
	import type { FunctionHeader } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let selectedFunction = $state<FunctionHeader | undefined>(undefined);
	let currentPage = $state(parseInt($page.url.searchParams.get('page') || '1'));
	let startDate = $state($page.url.searchParams.get('startDate') || data.defaultDates.startDate);
	let endDate = $state($page.url.searchParams.get('endDate') || data.defaultDates.endDate);
	let status = $state($page.url.searchParams.get('status') || 'all');
	const limit = 10;

	// Initialize selectedFunction from URL if funcHeaderId exists
	$effect(() => {
		const funcHeaderId = $page.url.searchParams.get('funcHeaderId');
		const funcName = $page.url.searchParams.get('funcName');
		const funcSlug = $page.url.searchParams.get('funcSlug');
		if (funcHeaderId && funcName && funcSlug) {
			selectedFunction = {
				id: parseInt(funcHeaderId),
				funcName,
				funcSlug
			};
		}
	});

	// Update URL when search parameters change
	$effect(() => {
		if (!loading) {
			const url = new URL($page.url);
			url.searchParams.set('page', currentPage.toString());
			url.searchParams.set('startDate', startDate);
			url.searchParams.set('endDate', endDate);
			url.searchParams.set('status', status);

			if (selectedFunction) {
				url.searchParams.set('funcHeaderId', selectedFunction.id.toString());
				url.searchParams.set('funcName', selectedFunction.funcName);
				url.searchParams.set('funcSlug', selectedFunction.funcSlug);
			} else {
				url.searchParams.delete('funcHeaderId');
				url.searchParams.delete('funcName');
				url.searchParams.delete('funcSlug');
			}

			goto(url.toString(), { replaceState: true });
		}
	});

	function handlePageChange(newPage: number) {
		currentPage = newPage;
	}

	function handleDateChange(event: Event, field: 'startDate' | 'endDate') {
		const value = (event.target as HTMLInputElement).value;
		if (field === 'startDate') {
			startDate = value;
		} else {
			endDate = value;
		}
	}

	function handleStatusChange(event: Event) {
		status = (event.target as HTMLSelectElement).value;
	}

	let pagination = $derived(form?.pagination || data.pagination);
	let results = $derived(form?.results || data.results);
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
		</div>

		<button
			type="submit"
			class="btn btn-primary mb-8 grid place-items-center"
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

	<div class="overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
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
						<td colspan="6" class="py-4 text-center">No results found</td>
					</tr>
				{/if}
			</tbody>
		</table>
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
				{#if currentPage > 3}
					<button class="btn btn-sm" onclick={() => handlePageChange(1)}>1</button>
					{#if currentPage > 4}
						<span class="btn btn-disabled btn-sm">...</span>
					{/if}
				{/if}

				{#each Array(3) as _, i}
					{@const page = Math.max(
						Math.min(currentPage + (i - 1), pagination.totalPages - 2),
						Math.min(3, pagination.totalPages - 2)
					)}
					<button
						class="btn btn-sm"
						class:btn-primary={currentPage === page}
						onclick={() => handlePageChange(page)}
					>
						{page}
					</button>
				{/each}

				{#if currentPage < pagination.totalPages - 2}
					{#if currentPage < pagination.totalPages - 3}
						<span class="btn btn-disabled btn-sm">...</span>
					{/if}
					<button class="btn btn-sm" onclick={() => handlePageChange(pagination.totalPages)}>
						{pagination.totalPages}
					</button>
				{/if}
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
			Showing {(currentPage - 1) * limit + 1} to {Math.min(
				currentPage * limit,
				pagination.totalCount
			)} of {pagination.totalCount} results
		</div>
	{/if}
</div>
