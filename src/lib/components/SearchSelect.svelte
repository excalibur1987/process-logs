<script lang="ts" generics="T">
  import { onMount, type Snippet } from "svelte";
  import lodash from "lodash";

  interface Props {
    name: string;
    placeholder?: string;
    value?: T;
    valueKey: keyof T;
    endpoint: string;
    searchKey?: string;
    optionView?: Snippet<[T]>;
    pageSize?: number;
  }

  let {
    name,
    placeholder = "Search...",
    value = $bindable<T | undefined>(undefined),
    valueKey,
    endpoint,
    searchKey = "search",
    optionView,
    pageSize = 10,
  }: Props = $props();

  let options = $state<T[]>([]);
  let loading = $state(false);
  let showDropdown = $state(false);
  let inputElement: HTMLInputElement | undefined = $state();
  let currentPage = $state(1);
  let totalPages = $state(1);
  let hasMore = $derived(currentPage < totalPages);
  let searchTerm = $state("");

  const searchFunctions = lodash.debounce(async (term: string, page = 1) => {
    loading = true;
    try {
      const params = new URLSearchParams({
        [searchKey]: term,
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();

      if (page === 1) {
        options = data.functions;
      } else {
        options = [...options, ...data.functions];
      }

      totalPages = data.pagination.totalPages;
      currentPage = page;
    } catch (error) {
      console.error("Search error:", error);
      if (page === 1) options = [];
    } finally {
      loading = false;
    }
  }, 300);

  function handleInput() {
    showDropdown = true;
    searchTerm = inputElement?.value ?? "";
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
    showDropdown = false;
  }

  function handleClickOutside() {
    showDropdown = false;
  }

  // Handle scroll to load more
  function handleScroll(event: Event) {
    const target = event.target as HTMLDivElement;
    if (
      target.scrollHeight - target.scrollTop <= target.clientHeight + 50 &&
      !loading &&
      hasMore
    ) {
      loadMore();
    }
  }

  onMount(() => {
    if (value) {
      searchTerm = value[valueKey] as string;
      searchFunctions(searchTerm);
    } else {
      // Load initial options without search term
      searchFunctions("");
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
      class="absolute z-50 mt-1 w-full bg-base-200 rounded-lg shadow-lg max-h-60 overflow-auto"
      onscroll={handleScroll}
    >
      {#each options as option}
        <button
          type="button"
          class="block w-full text-left px-4 py-2 hover:bg-base-300 cursor-pointer"
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
