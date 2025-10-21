<script lang="ts">
	interface Props {
		rows?: number;
		columns?: number;
	}

	let { rows = 5, columns = 6 }: Props = $props();
</script>

<div class="overflow-x-auto">
	<table class="table">
		<thead>
			<tr>
				{#each Array(columns) as _, i}
					<th>
						<div class="h-4 animate-pulse rounded bg-base-300"></div>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each Array(rows) as _, i}
				<tr>
					{#each Array(columns) as _, j}
						<td>
							<div class="h-4 animate-pulse rounded bg-base-200"></div>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
