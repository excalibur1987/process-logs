<script lang="ts">
  import { onMount } from "svelte";
  import type { FunctionLog } from "$lib/types";

  interface Props {
    funcId: number | string;
    initialLogs?: Promise<FunctionLog[]>;
    showHeader?: boolean;
    isFinished: boolean;
    pollingInterval?: number;
  }

  let {
    funcId,
    initialLogs,
    showHeader = false,
    isFinished,
    pollingInterval,
  }: Props = $props();

  let logs = $state<FunctionLog[]>([]);
  let loading = $state(!initialLogs);
  let error = $state<string | null>(null);

  let intervalId = $state<NodeJS.Timeout | undefined>(undefined);

  if (initialLogs) {
    initialLogs.then((loadedLogs) => {
      logs = loadedLogs;
    });
  }

  async function fetchLogs() {
    if (isFinished) return;

    loading = true;
    error = null;
    try {
      const response = await fetch(`/api/functions/${funcId}/logs`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      logs = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to fetch logs";
    } finally {
      loading = false;
    }
    if (intervalId) {
      clearInterval(intervalId);
    }

    // If the function is not finished, start polling
    if (!isFinished) {
      intervalId = setInterval(fetchLogs, pollingInterval);
    }
  }

  onMount(function () {
    fetchLogs();
    return async () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  });
</script>

<div class="space-y-2">
  {#if showHeader}
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Function Logs</h2>
      <div class="flex items-center gap-2">
        {#if !isFinished}
          <span class="badge badge-info gap-1">
            <span class="loading loading-dots loading-xs"></span>
            Auto-refreshing
          </span>
        {/if}
        <button class="btn btn-ghost btn-sm" onclick={fetchLogs}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="ml-2">Refresh</span>
        </button>
      </div>
    </div>
  {/if}

  {#if loading && !logs.length}
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
        {@const type = log.type?.toUpperCase()}
        <div
          class="card bg-base-100 border-l-4 transition-all hover:translate-x-1"
          class:border-info={type === "INFO"}
          class:border-success={type === "SUCCESS" || type === "FINAL"}
          class:border-warning={type === "WARNING"}
          class:border-error={type === "ERROR"}
          class:border-primary={![
            "INFO",
            "SUCCESS",
            "WARNING",
            "ERROR",
            "FINAL",
          ].includes(type)}
        >
          <div class="card-body p-4">
            <div class="flex items-center gap-4">
              <!-- Timestamp -->
              <span class="text-sm text-base-content/60 font-mono">
                {new Date(log.rowDate).toLocaleString()}
              </span>

              <!-- Log Type Badge with Icon -->
              <div class="flex items-center gap-2">
                <span
                  class="badge gap-1"
                  class:badge-info={type === "INFO"}
                  class:badge-success={type === "SUCCESS" || type === "FINAL"}
                  class:badge-warning={type === "WARNING"}
                  class:badge-error={type === "ERROR"}
                  class:badge-primary={![
                    "INFO",
                    "SUCCESS",
                    "WARNING",
                    "ERROR",
                    "FINAL",
                  ].includes(type)}
                >
                  {#if type === "INFO"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else if type === "SUCCESS" || type === "FINAL"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else if type === "WARNING"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else if type === "ERROR"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {/if}
                  {type}
                </span>
              </div>
            </div>

            <!-- Log Message -->
            <div class="mt-2">
              <p class="whitespace-pre-wrap font-mono text-sm">{log.message}</p>
            </div>

            <!-- Traceback (if exists) -->
            {#if log.traceBack}
              <div class="mt-4">
                <div class="collapse collapse-plus bg-base-200">
                  <input type="checkbox" />
                  <div class="collapse-title font-medium">View Traceback</div>
                  <div class="collapse-content">
                    <pre
                      class="text-sm font-mono whitespace-pre-wrap text-error">{log.traceBack}</pre>
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
