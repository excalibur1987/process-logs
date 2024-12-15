<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const { summary } = data;
</script>

<div class="p-8">
	<h1 class="mb-8 text-3xl font-bold">Function Execution Summary</h1>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<div class="stat rounded-box bg-base-200">
			<div class="stat-title">Total Functions</div>
			<div class="stat-value">{summary.total}</div>
		</div>

		<div class="stat rounded-box bg-info">
			<div class="stat-title">Running</div>
			<div class="stat-value">{summary.running}</div>
		</div>

		<div class="stat rounded-box bg-success">
			<div class="stat-title">Succeeded</div>
			<div class="stat-value">{summary.succeeded}</div>
		</div>

		<div class="stat rounded-box bg-error">
			<div class="stat-title">Failed</div>
			<div class="stat-value">{summary.failed}</div>
		</div>
	</div>

	<div class="mt-8">
		<h2 class="mb-4 text-2xl font-bold">Recent Functions</h2>
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
								<a
									data-sveltekit-preload-data="off"
									href="/functions/{func.funcId}"
									class="btn btn-sm"
								>
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
