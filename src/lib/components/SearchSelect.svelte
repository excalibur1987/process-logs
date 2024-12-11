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
  }

  let {
    name,
    placeholder = "Search...",
    value = $bindable<T | undefined>(undefined),
    valueKey,
    endpoint,
    searchKey = "search",
    optionView,
  }: Props = $props();

  let options = $state<T[]>([]);
  let loading = $state(false);
  let showDropdown = $state(false);
  let inputElement: HTMLInputElement | undefined = $state();

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
    const searchTerm = inputElement?.value ?? "";
    searchFunctions(searchTerm);
  }

  function selectOption(option: T) {
    value = option;
    showDropdown = false;
  }

  function handleClickOutside() {
    showDropdown = false;
  }

  onMount(() => {
    if (value) {
      searchFunctions(value?.[valueKey ?? "id"] as string);
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
    value={value?.[valueKey ?? "id"]}
    oninput={handleInput}
    onfocus={() => (showDropdown = true)}
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
            onclick={() => selectOption(option)}
          >
            {#if optionView}
              {@render optionView(option)}
            {:else}
              {option[valueKey ?? "id"]}
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
