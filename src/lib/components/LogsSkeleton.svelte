<div class="space-y-3">
	{#each Array(8) as _, i (i)}
		<div class="flex items-center space-x-3 rounded-lg border border-base-300 bg-base-100 p-3">
			<div class="skeleton h-4 w-32"></div>
			<div class="skeleton h-5 w-16"></div>
			<div class="skeleton h-4 w-full"></div>
		</div>
	{/each}
</div>
