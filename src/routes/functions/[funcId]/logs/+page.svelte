<script lang="ts">
  import type { PageData } from "./$types";
  import FunctionLogs from "$lib/components/FunctionLogs.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const { function: func, logs } = data;
</script>

<div class="p-8">
  <div class="flex justify-between items-center mb-8">
    <div>
      <h1 class="text-3xl font-bold">Function Logs</h1>
      <div class="text-base-content/60 mt-2">
        <span class="font-semibold">{func.funcName}</span>
        <span class="mx-2">•</span>
        <span>{func.headerSlug}</span>
        <span class="mx-2">•</span>
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

    <div class="flex gap-2">
      <a href="/functions/{func.funcId}" class="btn"> View Details </a>
      <a href="/search" class="btn"> Back to Search </a>
    </div>
  </div>

  <FunctionLogs funcId={func.funcId} initialLogs={logs} />
</div>
