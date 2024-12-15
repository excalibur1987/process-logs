<script lang="ts" generics="T">
	import { onMount, type Snippet } from 'svelte';
	import lodash from 'lodash';

	interface Props {
		name: string;
		placeholder?: string;
		initialValue?: T;
		valueKey: keyof T;
		endpoint: string;
		searchKey?: string;
		optionView?: Snippet<[T]>;
		pageSize?: number;
		changeSelected?: (item: T) => void;
	}

	let {
		name,
		placeholder = 'Search...',
		initialValue = undefined,
		valueKey,
		endpoint,
		searchKey = 'search',
		optionView,
		pageSize = 10,
		changeSelected
	}: Props = $props();

	let value = $state<T | undefined>(initialValue);
	let options = $state<T[]>([]);
	let loading = $state(false);
	let showDropdown = $state(false);
	let inputElement: HTMLInputElement | undefined = $state();
	let currentPage = $state(1);
	let totalPages = $state(1);
	let hasMore = $derived(currentPage < totalPages);
	let searchTerm = $state('');

	const searchFunctions = lodash.debounce(async (term: string, page = 1) => {
		loading = true;
		try {
			const params = new URLSearchParams({
				[searchKey]: term,
				page: page.toString(),
				limit: pageSize.toString()
			});

			const response = await fetch(`${endpoint}?${params}`);
			if (!response.ok) throw new Error('Search failed');
			const data = await response.json();

			if (page === 1) {
				options = data.functions;
			} else {
				options = [...options, ...data.functions];
			}

			totalPages = data.pagination.totalPages;
			currentPage = page;
		} catch (error) {
			console.error('Search error:', error);
			if (page === 1) options = [];
		} finally {
			loading = false;
		}
	}, 300);

	function handleInput() {
		showDropdown = true;
		searchTerm = inputElement?.value ?? '';
		currentPage = 1;
		searchFunctions(searchTerm);
	}

	function loadMore() {
		if (!loading && hasMore) {
			searchFunctions(searchTerm, currentPage + 1);
		}
	}

	function selectOption(option: T) {
		value = option;
		changeSelected?.(option);
		showDropdown = false;
	}

	// Handle scroll to load more
	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50 && !loading && hasMore) {
			loadMore();
		}
	}

	onMount(() => {
		if (value) {
			searchTerm = value[valueKey] as string;
			searchFunctions(searchTerm);
		} else {
			// Load initial options without search term
			searchFunctions('');
		}
	});

	// Update value when initialValue changes
	$effect(() => {
		value = initialValue;
		if (value) {
			searchTerm = value[valueKey] as string;
		}
	});
</script>

<div class="relative">
	<input
		bind:this={inputElement}
		{name}
		type="text"
		class="input input-bordered w-full"
		{placeholder}
		value={value?.[valueKey]}
		oninput={handleInput}
		onfocus={() => (showDropdown = true)}
	/>

	{#if showDropdown && (loading || options.length > 0)}
		<div
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-base-200 shadow-lg"
			onscroll={handleScroll}
		>
			{#each options as option}
				<button
					type="button"
					class="block w-full cursor-pointer px-4 py-2 text-left hover:bg-base-300"
					onclick={() => selectOption(option)}
				>
					{#if optionView}
						{@render optionView(option)}
					{:else}
						{option[valueKey]}
					{/if}
				</button>
			{/each}

			{#if loading}
				<div class="p-2 text-center">
					<span class="loading loading-spinner loading-sm"></span>
				</div>
			{/if}

			{#if !loading && options.length === 0}
				<div class="p-2 text-center text-base-content/60">No results found</div>
			{/if}
		</div>
	{/if}
</div>
