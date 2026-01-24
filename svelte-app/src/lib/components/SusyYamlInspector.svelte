<script lang="ts">
  import { stringify as yamlStringify } from '@lush/yaml'
  import IndexedYamlPanel from '$lib/components/IndexedYamlPanel.svelte'
  import type { SusyNode } from 'lush-types'

  const { root = null } = $props<{
    root?: SusyNode | null
  }>()

  // Replace kind/type pairs with a fused kt key for YAML output.
  function fuseKindType(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => fuseKindType(entry))
    }
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>
      const kind = record.kind
      const type = record.type
      const hasPair = typeof kind === 'string' && typeof type === 'string'
      const result: Record<string, unknown> = {}
      if (hasPair) result.kt = `${kind}.${type}`
      for (const [key, entry] of Object.entries(record)) {
        if (hasPair && (key === 'kind' || key === 'type')) continue
        result[key] = fuseKindType(entry)
      }
      return result
    }
    return value
  }

  // Format Susy YAML after kind/type fusion.
  function formatSusyYaml(value: unknown): string {
    return yamlStringify(fuseKindType(value)).trimEnd()
  }
</script>

<IndexedYamlPanel
  title="Susy YAML"
  value={root}
  formatValue={formatSusyYaml}
  footer="Projection updates as you edit the structural tree."
  containerClass="h-full p-6"
/>
