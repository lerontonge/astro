<script lang="ts">
	let { prefix, children } = $props()
	let count = $state(0);

	function add() {
		count += 1;
	}

	function subtract() {
		count -= 1;
	}
</script>

<div class="counter">
	<button onclick={subtract} class="decrement">-</button>
	<pre>{prefix}{count}</pre>
	<button onclick={add} class="increment">+</button>
</div>
<div class="message">
	{@render children?.()}
</div>

<style>
	.counter {
		display: grid;
		font-size: 2em;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-top: 2em;
		place-items: center;
	}

	.message {
		text-align: center;
		background-color: maroon;
		color: tomato;
	}
</style>
