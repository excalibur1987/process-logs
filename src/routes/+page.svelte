<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
  const { summary } = data;
</script>

<div class="p-8">
  <h1 class="text-3xl font-bold mb-8">Function Execution Summary</h1>
  
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="stat bg-base-200 rounded-box">
      <div class="stat-title">Total Functions</div>
      <div class="stat-value">{summary.total}</div>
    </div>
    
    <div class="stat bg-info rounded-box">
      <div class="stat-title">Running</div>
      <div class="stat-value">{summary.running}</div>
    </div>
    
    <div class="stat bg-success rounded-box">
      <div class="stat-title">Succeeded</div>
      <div class="stat-value">{summary.succeeded}</div>
    </div>
    
    <div class="stat bg-error rounded-box">
      <div class="stat-title">Failed</div>
      <div class="stat-value">{summary.failed}</div>
    </div>
  </div>

  <div class="mt-8">
    <h2 class="text-2xl font-bold mb-4">Recent Functions</h2>
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Function Name</th>
            <th>Start Date</th>
            <th>Status</th>
            <th>Source</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each summary.results.slice(0, 10) as func}
            <tr>
              <td>{func.funcName}</td>
              <td>{new Date(func.startDate).toLocaleString()}</td>
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
        </tbody>
      </table>
    </div>
  </div>
</div> 