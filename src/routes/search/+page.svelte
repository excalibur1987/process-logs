<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import { enhance } from "$app/forms";
  import SearchSelect from "$lib/components/SearchSelect.svelte";

  interface Props {
    data: PageData;
    form: ActionData;
  }

  let { data, form }: Props = $props();

  let loading = $state(false);
  let selectedFunction = $state<{ id: number; funcName: string } | undefined>(
    undefined
  );
</script>

<div class="p-8">
  <h1 class="text-3xl font-bold mb-8">Search Functions</h1>

  <form
    method="POST"
    action="?/search"
    use:enhance={() => {
      loading = true;
      return async ({ update }) => {
        loading = false;
        await update({ reset: false });
      };
    }}
  >
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="form-control">
        <label class="label" for="funcName">
          <span class="label-text">Function Name</span>
        </label>

        {#snippet optionView(option: { id: number; funcName: string })}
          <span>{option.funcName}</span>
        {/snippet}

        <SearchSelect
          name="funcName"
          endpoint="/api/functions/names"
          searchKey="search"
          placeholder="Search for a function..."
          bind:value={selectedFunction}
          valueKey="funcName"
          {optionView}
        ></SearchSelect>
      </div>

      <div class="form-control">
        <label class="label" for="startDate">
          <span class="label-text">Start Date</span>
        </label>
        <input
          type="date"
          name="startDate"
          value={data.defaultDates.startDate}
          class="input input-bordered"
        />
      </div>

      <div class="form-control">
        <label class="label" for="endDate">
          <span class="label-text">End Date</span>
        </label>
        <input
          type="date"
          name="endDate"
          value={data.defaultDates.endDate}
          class="input input-bordered"
        />
      </div>

      <div class="form-control">
        <label class="label" for="status">
          <span class="label-text">Status</span>
        </label>
        <select id="status" name="status" class="select select-bordered">
          <option value="all">All</option>
          <option value="running">Running</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div class="form-control">
        <label class="label" for="isParent">
          <span class="label-text">Parent</span>
        </label>
        <input
          id="isParent"
          type="checkbox"
          name="isParent"
          class="checkbox checkbox-primary"
        />
      </div>
    </div>

    <button type="submit" class="btn btn-primary mb-8" disabled={loading}>
      {#if loading}
        <span class="loading loading-spinner"></span>
      {/if}
      Search
    </button>
  </form>

  <div class="overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th>Function Name</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Status</th>
          <th>Source</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if form?.results}
          {#each form.results as func}
            <tr>
              <td>{func.funcName}</td>
              <td>{new Date(func.startDate).toLocaleString()}</td>
              <td>
                {func.endDate ? new Date(func.endDate).toLocaleString() : "-"}
              </td>
              <td>
                {#if !func.finished}
                  <span class="badge badge-info">Running</span>
                {:else if func.success}
                  <span class="badge badge-success">Success</span>
                {:else}
                  <span class="badge badge-error">Failed</span>
                {/if}
              </td>
              <td>{func.source}</td>
              <td>
                <a href="/functions/{func.funcId}" class="btn btn-sm">
                  View Details
                </a>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
