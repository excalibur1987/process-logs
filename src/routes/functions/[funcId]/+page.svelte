<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let functionDetails = $state(null);
  let logs = $state([]);
  let loading = $state(true);
  let error = $state(null);

  async function fetchFunctionDetails() {
    try {
      const response = await fetch(`/api/functions/${$page.params.funcId}`);
      if (!response.ok) throw new Error('Failed to fetch function details');
      
      const data = await response.json();
      functionDetails = data.function;
      logs = data.logs;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(fetchFunctionDetails);
</script>

{#if loading}
  <div class="flex justify-center items-center h-screen">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if error}
  <div class="alert alert-error m-8">
    <span>{error}</span>
  </div>
{:else}
  <div class="p-8">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold">Function Details</h1>
      <a href="/search" class="btn">Back to Search</a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title">Function Information</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="font-semibold">Name:</div>
            <div>{functionDetails.funcName}</div>
            
            <div class="font-semibold">Status:</div>
            <div>
              {#if !functionDetails.finished}
                <span class="badge badge-info">Running</span>
              {:else if functionDetails.success}
                <span class="badge badge-success">Success</span>
              {:else}
                <span class="badge badge-error">Failed</span>
              {/if}
            </div>
            
            <div class="font-semibold">Start Date:</div>
            <div>{new Date(functionDetails.startDate).toLocaleString()}</div>
            
            <div class="font-semibold">End Date:</div>
            <div>
              {functionDetails.endDate 
                ? new Date(functionDetails.endDate).toLocaleString() 
                : '-'}
            </div>
            
            <div class="font-semibold">Source:</div>
            <div>{functionDetails.source}</div>
            
            {#if functionDetails.args}
              <div class="font-semibold">Arguments:</div>
              <div class="overflow-x-auto">
                <pre class="text-sm">{JSON.stringify(JSON.parse(functionDetails.args), null, 2)}</pre>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title">Function Tree</h2>
          {#if functionDetails.parentId}
            <div class="alert alert-info">
              <a href="/functions/{functionDetails.parentId}" class="link">
                View Parent Function
              </a>
            </div>
          {/if}
          <!-- Add child functions here if needed -->
        </div>
      </div>
    </div>

    <div class="mt-8">
      <h2 class="text-2xl font-bold mb-4">Function Logs</h2>
      <div class="space-y-4">
        {#each logs as log}
          <div class="card bg-base-100">
            <div class="card-body">
              <div class="flex items-center gap-4">
                <span class="text-sm text-base-content/60">
                  {new Date(log.rowDate).toLocaleString()}
                </span>
                <span class="badge" class:badge-info={log.type === 'INFO'}
                  class:badge-warning={log.type === 'WARNING'}
                  class:badge-error={log.type === 'ERROR'}>
                  {log.type}
                </span>
              </div>
              <p class="whitespace-pre-wrap">{log.message}</p>
              {#if log.traceBack}
                <div class="mt-4">
                  <div class="collapse collapse-plus bg-base-200">
                    <input type="checkbox" />
                    <div class="collapse-title font-medium">
                      View Traceback
                    </div>
                    <div class="collapse-content">
                      <pre class="text-sm whitespace-pre-wrap">{log.traceBack}</pre>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if} 