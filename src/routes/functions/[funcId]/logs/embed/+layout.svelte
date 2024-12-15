<script lang="ts">
	import '$src/app.css';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div>
	{@render children?.()}
</div>

<style>
	/* Reset styles for embedding */
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		height: 100%;
		background: transparent;
	}
</style>
