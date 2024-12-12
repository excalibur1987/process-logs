<script lang="ts">
  import type { PageData } from "./$types";
  import FunctionLogs from "$lib/components/FunctionLogs.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const { function: func, logs } = data;

  let copied = $state(false);

  async function copyEmbedCode() {
    const embedCode = `<iframe
        src="${window.location.origin}/functions/${func.funcId}/logs/embed"
        width="100%"
        height="600"
        frameborder="0"
        style="border: 1px solid #e2e8f0; border-radius: 0.5rem;"
        ></iframe>`;
    await navigator.clipboard.writeText(embedCode);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
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
      <div class="dropdown dropdown-end">
        <button
          class="btn btn-outline"
          onclick={copyEmbedCode}
          class:btn-success={copied}
        >
          {#if copied}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            Copied!
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"
              />
              <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
            </svg>
            Copy Embed Code
          {/if}
        </button>
      </div>
      <a href="/functions/{func.funcId}" class="btn">View Details</a>
      <a href="/search" class="btn">Back to Search</a>
    </div>
  </div>

  <FunctionLogs
    funcId={func.funcId}
    initialLogs={logs}
    isFinished={func.finished}
  />
</div>
