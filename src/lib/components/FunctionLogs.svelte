<script lang="ts">
  import { onMount } from "svelte";
  import type { FunctionLog } from "$lib/types";

  interface Props {
    funcId: number;
    initialLogs?: Promise<FunctionLog[]>;
    showHeader?: boolean;
  }

  let { funcId, initialLogs, showHeader = false }: Props = $props();
  let logs = $state<FunctionLog[]>([]);
  let loading = $state(!initialLogs);
  let error = $state<string | null>(null);

  if (initialLogs) {
    initialLogs.then((loadedLogs) => {
      logs = loadedLogs;
    });
  }

  async function fetchLogs() {
    if (initialLogs) return;

    loading = true;
    error = null;
    try {
      const response = await fetch(`/api/functions/${funcId}/logs`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      logs = await response.json();
    } catch (err) {
      console.error("Error fetching logs:", err);
      error = err instanceof Error ? err.message : "Failed to fetch logs";
    } finally {
      loading = false;
    }
  }

  onMount(fetchLogs);
</script>

<div class={showHeader ? "mt-8" : ""}>
  {#if showHeader}
    <h2 class="text-2xl font-bold mb-4">Function Logs</h2>
  {/if}

  {#if loading}
    <div class="flex justify-center p-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if error}
    <div class="alert alert-error">
      <span>{error}</span>
      <button class="btn btn-sm" onclick={fetchLogs}>Retry</button>
    </div>
  {:else if logs.length === 0}
    <div class="text-center p-8 text-base-content/60">
      No logs found for this function
    </div>
  {:else}
    <div class="space-y-4">
      {#each logs as log}
        <div class="card bg-base-100">
          <div class="card-body">
            <div class="flex items-center gap-4">
              <span class="text-sm text-base-content/60">
                {new Date(log.rowDate).toLocaleString()}
              </span>
              <span
                class="badge"
                class:badge-info={log.type === "INFO"}
                class:badge-warning={log.type === "WARNING"}
                class:badge-error={log.type === "ERROR"}
              >
                {log.type}
              </span>
            </div>
            <p class="whitespace-pre-wrap">{log.message}</p>
            {#if log.traceBack}
              <div class="mt-4">
                <div class="collapse collapse-plus bg-base-200">
                  <input type="checkbox" />
                  <div class="collapse-title font-medium">View Traceback</div>
                  <div class="collapse-content">
                    <pre
                      class="text-sm whitespace-pre-wrap">{log.traceBack}</pre>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
