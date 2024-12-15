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
	const limit = 10;

	$effect(() => {
		console.log('🚀 ~ file: +page.svelte:17 ~ $effect ~ selectedFunction:', selectedFunction);
	});

	$effect(() => {
		if (!loading) {
			const url = $page.url;
			url.searchParams.set('page', currentPage.toString());
			goto(url.toString(), { replaceState: true });
		}
	});

	function handlePageChange(newPage: number) {
		currentPage = newPage;
	}

	const pagination = form?.pagination || data.pagination;
	const results = form?.results || data.results;
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
				await update({ reset: false });
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
					bind:value={selectedFunction}
					valueKey="funcName"
					endpoint="/api/functions/names"
					pageSize={20}
					optionView={renderOption}
				/>
			</div>

			<div class="form-control">
				<label class="label" for="startDate">
					<span class="label-text">Start Date</span>
				</label>
				<input
					type="date"
					name="startDate"
					value={data.defaultDates.startDate}
					class="input input-bordered"
				/>
			</div>

			<div class="form-control">
				<label class="label" for="endDate">
					<span class="label-text">End Date</span>
				</label>
				<input
					type="date"
					name="endDate"
					value={data.defaultDates.endDate}
					class="input input-bordered"
				/>
			</div>

			<div class="form-control">
				<label class="label" for="status">
					<span class="label-text">Status</span>
				</label>
				<select id="status" name="status" class="select select-bordered">
					<option value="all">All</option>
					<option value="running">Running</option>
					<option value="success">Success</option>
					<option value="failed">Failed</option>
				</select>
			</div>
		</div>

		<button type="submit" class="btn btn-primary mb-8" disabled={loading}>
			{#if loading}
				<span class="loading loading-spinner"></span>
			{/if}
			Search
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
