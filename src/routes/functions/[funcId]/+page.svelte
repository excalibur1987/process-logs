<script lang="ts">
  import type { PageData } from "./$types";
  import { invalidateAll } from "$app/navigation";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const { function: func, logs, children } = data;
</script>

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
          <div>{func.funcName}</div>

          <div class="font-semibold">Slug:</div>
          <div>{func.headerSlug}</div>

          <div class="font-semibold">Status:</div>
          <div>
            {#if !func.finished}
              <span class="badge badge-info">Running</span>
            {:else if func.success}
              <span class="badge badge-success">Success</span>
            {:else}
              <span class="badge badge-error">Failed</span>
            {/if}
          </div>

          <div class="font-semibold">Start Date:</div>
          <div>{new Date(func.startDate).toLocaleString()}</div>

          <div class="font-semibold">End Date:</div>
          <div>
            {func.endDate ? new Date(func.endDate).toLocaleString() : "-"}
          </div>

          <div class="font-semibold">Source:</div>
          <div>{func.source}</div>

          {#if func.args}
            <div class="font-semibold">Arguments:</div>
            <div class="overflow-x-auto">
              <pre class="text-sm">{JSON.stringify(func.args, null, 2)}</pre>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="card bg-base-200">
      <div class="card-body">
        <h2 class="card-title mb-4">Function Tree</h2>

        <!-- Parent Function -->
        {#if func.parentId}
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-base-content/70 mb-2">
              Parent Function
            </h3>
            <a
              href="/functions/{func.parentId}"
              class="card bg-base-100 hover:bg-base-300 transition-colors"
              data-sveltekit-reload
            >
              <div class="card-body p-4">
                <div class="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>View Parent</span>
                </div>
              </div>
            </a>
          </div>
        {/if}

        <!-- Current Function -->
        <div class="relative mb-6">
          <h3 class="text-sm font-semibold text-base-content/70 mb-2">
            Current Function
          </h3>
          <div class="card bg-primary text-primary-content">
            <div class="card-body p-4">
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-semibold">{func.funcName}</div>
                  <div class="text-sm opacity-70">{func.slug}</div>
                </div>
                <div>
                  {#if !func.finished}
                    <span class="badge badge-info">Running</span>
                  {:else if func.success}
                    <span class="badge badge-success">Success</span>
                  {:else}
                    <span class="badge badge-error">Failed</span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Child Functions -->
        {#await children}
          <div>Loading children...</div>
        {:then childrenData}
          {#if childrenData.length > 0}
            <div>
              <h3 class="text-sm font-semibold text-base-content/70 mb-2">
                Child Functions ({childrenData.length})
              </h3>
              <div class="space-y-2 flex flex-col gap-2">
                {#each childrenData as child}
                  <a href="/functions/{child.funcId}" data-sveltekit-reload>
                    <div
                      class="card bg-base-100 hover:bg-base-300 transition-colors"
                    >
                      <div class="card-body p-4">
                        <div
                          class="flex justify-between items-center flex-wrap"
                        >
                          <div>
                            <div class="font-semibold">{child.funcName}</div>
                            <div class="text-sm opacity-70">{child.slug}</div>
                          </div>
                          <div class="flex items-center gap-2">
                            {#if !child.finished}
                              <span class="badge badge-info">Running</span>
                            {:else if child.success}
                              <span class="badge badge-success">Success</span>
                            {:else}
                              <span class="badge badge-error">Failed</span>
                            {/if}
                          </div>
                        </div>
                      </div>
                    </div>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
        {/await}
      </div>
    </div>
  </div>

  <div class="mt-8">
    <h2 class="text-2xl font-bold mb-4">Function Logs</h2>
    <div class="space-y-4">
      {#await logs}
        <div>Loading logs...</div>
      {:then logsData}
        <div>
          {#each logsData as log}
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
                      <div class="collapse-title font-medium">
                        View Traceback
                      </div>
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
      {/await}
    </div>
  </div>
</div>
