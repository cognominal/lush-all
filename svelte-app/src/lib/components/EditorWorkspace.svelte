<script lang="ts">
  import StructuralEditor from '$lib/components/StructuralEditor.svelte'
  import SusyYamlPanel from '$lib/components/SusyYamlPanel.svelte'
  import type { SusyNode } from 'lush-types'

  let root = $state<SusyNode | null>(null)
</script>

<div class="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
  <div class="min-h-0 flex-1">
    <StructuralEditor on:rootChange={(event) => (root = event.detail)} />
  </div>
  <div class="min-h-0 flex-1">
    <SusyYamlPanel {root} />
  </div>
</div>
