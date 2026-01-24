<script lang="ts">
  let count = 0

  const increment = () => {
    count += 1
  }
</script>

<button onclick={increment}>Clicked {count}</button>
