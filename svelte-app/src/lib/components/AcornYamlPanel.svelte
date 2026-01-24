<script lang="ts">
  import { parse } from 'svelte/compiler'
  import { parse as parseJs } from 'acorn'
  import { Parser } from 'acorn'
  import { tsPlugin } from '@sveltejs/acorn-typescript'
  import IndexedYamlPanel from '$lib/components/IndexedYamlPanel.svelte'

  type SourceLanguage = 'svelte' | 'js' | 'ts'

  const { sourceText = null, language = 'svelte' } = $props<{
    sourceText?: string | null
    language?: SourceLanguage
  }>()

  const emptyMessage = '# AST YAML will appear here.'

  let astValue = $state<unknown | null>(null)
  let overrideYaml = $state<string | null>(null)

  // Build a TS-enabled Acorn parser.
  const TypeScriptParser = Parser.extend(tsPlugin({ jsx: false }))

  // Parse Svelte source into a legacy AST for YAML serialization.
  function parseLegacyAst(source: string): unknown {
    return parse(source, { modern: false })
  }

  // Parse JS source into an Acorn AST.
  // Parse JS source into an Acorn AST.
  function parseJsAst(source: string): unknown {
    return parseJs(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true
    })
  }

  // Parse TS source into an Acorn AST.
  function parseTsAst(source: string): unknown {
    return TypeScriptParser.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true
    })
  }

  $effect(() => {
    if (!sourceText || !sourceText.trim()) {
      astValue = null
      overrideYaml = null
      return
    }

    try {
      astValue =
        language === 'svelte'
          ? parseLegacyAst(sourceText)
          : language === 'ts'
            ? parseTsAst(sourceText)
            : parseJsAst(sourceText)
      overrideYaml = null
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to parse ${language.toUpperCase()} source.`
      astValue = null
      overrideYaml = `! parse error: ${message}`
    }
  })
</script>

<IndexedYamlPanel
  title="AST YAML"
  value={astValue}
  emptyMessage={emptyMessage}
  overrideYaml={overrideYaml}
  containerClass="gap-3"
  panelClass="h-64 min-h-0 rounded-xl border border-surface-700/60 bg-surface-900/70"
/>
