<script lang="ts">
  import type { PageData } from "./$types";
  import FunctionLogs from "$lib/components/FunctionLogs.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const { function: func, logs } = data;
</script>

<div class="p-4">
  <div class="text-base-content/60 mb-4">
    <div class="flex items-center gap-2">
      <span class="font-semibold">{func.funcName}</span>
      <span
        class="badge"
        class:badge-info={!func.finished}
        class:badge-success={func.finished && func.success}
        class:badge-error={func.finished && !func.success}
      >
        {#if !func.finished}
          Running
        {:else if func.success}
          Success
        {:else}
          Failed
        {/if}
      </span>
    </div>
  </div>

  <FunctionLogs funcId={func.funcId} initialLogs={logs} showHeader={false} />
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
