<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { clickOutside } from "$lib/actions/clickOutside";
  import lodash from "lodash";

  export let name: string;
  export let placeholder = "Search...";
  export let value = "";
  export let endpoint;
  export let searchKey = "search";

  let searchTerm = "";
  let options: { id: number; funcName: string }[] = [];
  let loading = false;
  let showDropdown = false;
  let inputElement: HTMLInputElement;

  const dispatch = createEventDispatcher();

  const searchFunctions = lodash.debounce(async (term: string) => {
    if (!term) {
      options = [];
      return;
    }

    loading = true;
    try {
      const response = await fetch(
        `${endpoint}?${searchKey}=${encodeURIComponent(term)}`
      );
      if (!response.ok) throw new Error("Search failed");
      options = await response.json();
    } catch (error) {
      console.error("Search error:", error);
      options = [];
    } finally {
      loading = false;
    }
  }, 300);

  function handleInput() {
    showDropdown = true;
    searchTerm = inputElement.value;
    value = searchTerm;
    dispatch("change", searchTerm);
    searchFunctions(searchTerm);
  }

  function selectOption(option: { id: number; funcName: string }) {
    searchTerm = option.funcName;
    value = option.funcName;
    dispatch("change", option.funcName);
    showDropdown = false;
  }

  function handleClickOutside() {
    showDropdown = false;
  }

  onMount(() => {
    if (value) {
      searchTerm = value;
      searchFunctions(value);
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
    value={searchTerm}
    on:input={handleInput}
    on:focus={() => (showDropdown = true)}
  />

  {#if showDropdown && (loading || options.length > 0)}
    <div
      class="absolute z-50 mt-1 w-full bg-base-200 rounded-lg shadow-lg max-h-60 overflow-auto"
    >
      {#if loading}
        <div class="p-2 text-center">
          <span class="loading loading-spinner loading-sm"></span>
        </div>
      {:else}
        {#each options as option}
          <button
            type="button"
            class="block w-full text-left px-4 py-2 hover:bg-base-300 cursor-pointer"
            on:click={() => selectOption(option)}
          >
            {option.funcName}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
