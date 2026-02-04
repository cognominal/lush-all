<script lang="ts">
  import '../app.css'

  let { children } = $props()

  let aboutOpen = $state(false)
  let aboutMessage = $state('Lush app (early stage)')

  let loginOpen = $state(false)
  let loginStatus = $state<{ state: 'idle' | 'loading' | 'loaded' | 'error'; message?: string }>({
    state: 'idle'
  })
  let loginUserEmail = $state<string | null>(null)

  // Open the About dialog.
  function openAbout() {
    aboutMessage = 'Lush app (early stage)'
    aboutOpen = true
  }

  // Open the login dialog and fetch session info.
  async function openLogin() {
    loginOpen = true
    loginStatus = { state: 'loading' }
    loginUserEmail = null

    try {
      const res = await fetch('/api/me')
      const data: unknown = await res.json()
      if (!data || typeof data !== 'object') {
        loginStatus = { state: 'error', message: 'Unexpected /api/me response' }
        return
      }
      const authenticated = (data as { authenticated?: unknown }).authenticated
      if (authenticated === true) {
        const user = (data as { user?: unknown }).user
        if (user && typeof user === 'object') {
          const email = (user as { email?: unknown }).email
          if (typeof email === 'string') loginUserEmail = email
        }
        loginStatus = { state: 'loaded', message: 'Already signed in.' }
        return
      }
      if (authenticated === false) {
        loginStatus = { state: 'loaded' }
        return
      }
      loginStatus = { state: 'error', message: 'Unexpected /api/me response' }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      loginStatus = { state: 'error', message }
    }
  }

  // Continue with the WorkOS login flow.
  function continueLogin() {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`
  }

  type Unlisten = () => void

  type TauriEventApi = {
    listen: (
      event: string,
      cb: (payload: { payload: unknown }) => void
    ) => Promise<Unlisten>
  }

  // Resolve the Tauri event API when running in the desktop app.
  function getTauriEventApi(): TauriEventApi | null {
    const g = globalThis as unknown as { __TAURI__?: unknown }
    if (!g.__TAURI__ || typeof g.__TAURI__ !== 'object') return null
    const rec = g.__TAURI__ as Record<string, unknown>
    const event = rec.event
    if (!event || typeof event !== 'object') return null
    const listen = (event as Record<string, unknown>).listen
    if (typeof listen !== 'function') return null
    return event as TauriEventApi
  }

  const tauriEventApi = getTauriEventApi()
  const isTauri = tauriEventApi != null

  import SvelteDevMenuBar from '$lib/components/SvelteDevMenuBar.svelte'
  import { LUSH_MENU_BAR } from '$lib/logic/menu'
  import { onDestroy, onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import CommandPalette from '$lib/components/CommandPalette.svelte'
  import { registerCommand, registerKeybinding, type Command } from '$lib/logic/commands'
  import { setYamlFileContent } from '$lib/logic/yamlFile'
  import { workspace } from '$lib/config/workspaceConfiguration'

  let unlisten: Unlisten | null = null
  let teardownDomAbout: (() => void) | null = null
  let teardownDomMenuAction: (() => void) | null = null
  let teardownPaletteHotkey: (() => void) | null = null
  let teardownEscapeClose: (() => void) | null = null
  let paletteOpen = $state(false)

  // Open the command palette.
  function openPalette() {
    paletteOpen = true
  }

  // Close the command palette.
  function closePalette() {
    paletteOpen = false
  }

  // Run a command handler and close the palette.
  function executeCommand(command: Command) {
    command.handler()
    closePalette()
  }

  // Prompt the user for a YAML file and load it.
  async function openYamlFilePicker() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.yaml,.yml,text/yaml,application/x-yaml'
    const file = await new Promise<File | null>((resolve) => {
      input.onchange = () => {
        resolve(input.files?.[0] ?? null)
      }
      input.click()
    })
    if (!file) return
    const text = await file.text()
    setYamlFileContent(text)
  }

  // Register or update the block highlight command label.
  function registerBlockHighlightCommand() {
    const enabled = workspace
      .getConfiguration()
      .get('editor.blockSelectHighlight', true)
    registerCommand({
      command: 'lush.toggleBlockSelectHighlight',
      title: enabled ? 'Unset Block Selection Highlight' : 'Set Block Selection Highlight',
      category: 'Editor',
      f1: true,
      handler: () => {
        toggleBlockSelectionHighlight()
      }
    })
  }

  // Toggle block-style highlight rendering for multiline selections.
  function toggleBlockSelectionHighlight() {
    const config = workspace.getConfiguration()
    const current = config.get('editor.blockSelectHighlight', true)
    config.update('editor.blockSelectHighlight', !current)
    registerBlockHighlightCommand()
  }

  // Register menu commands in the VS Code-style registry.
  function registerMenuCommands() {
    registerCommand({
      command: 'workbench.action.showCommands',
      title: 'Show All Commands',
      category: 'View',
      f1: true,
      handler: () => {
        openPalette()
      }
    })

    registerKeybinding({
      command: 'workbench.action.showCommands',
      key: 'Ctrl+Shift+P',
      mac: 'Cmd+Shift+P'
    })

    registerCommand({
      command: 'lush.openYamlFile',
      title: 'Open YAML File...',
      category: 'Lush',
      f1: true,
      handler: () => {
        void openYamlFilePicker()
      }
    })

    registerKeybinding({
      command: 'lush.openYamlFile',
      key: 'Ctrl+O',
      mac: 'Cmd+O'
    })

    registerCommand({
      command: 'lush.openEditor',
      title: 'Open Editor',
      category: 'Lush',
      f1: true,
      handler: () => {
        void goto('/editor')
      }
    })

    registerCommand({
      command: 'lush.openDocs',
      title: 'Open Docs',
      category: 'Lush',
      f1: true,
      handler: () => {
        void goto('/docs?path=lush.md')
      }
    })

    registerCommand({
      command: 'lush.openYamlSample',
      title: 'Open yaml_sample',
      category: 'Lush',
      f1: false,
      handler: () => {
        setYamlFileContent(null)
        void goto('/yaml-explore')
      }
    })

    registerCommand({
      command: 'lush.login',
      title: 'Login',
      category: 'Lush',
      f1: true,
      handler: () => {
        void openLogin()
      }
    })

    registerCommand({
      command: 'lush.about',
      title: 'About Lush',
      category: 'Lush',
      f1: true,
      handler: () => {
        openAbout()
      }
    })

    registerBlockHighlightCommand()
  }

  // Install global keyboard shortcuts for the command palette.
  function installPaletteHotkey() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault()
        openPalette()
        return
      }
      if (event.key.toLowerCase() !== 'p') return
      const isMac = navigator.platform.toLowerCase().includes('mac')
      if (isMac && event.metaKey && event.shiftKey) {
        event.preventDefault()
        openPalette()
        return
      }
      if (!isMac && event.ctrlKey && event.shiftKey) {
        event.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }

  // Install global escape handling for dialogs.
  function installEscapeClose() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (aboutOpen) aboutOpen = false
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }
  onMount(async () => {
    registerMenuCommands()
    teardownPaletteHotkey = installPaletteHotkey()
    teardownEscapeClose = installEscapeClose()
    const onDomAbout = (e: Event) => {
      const ce = e as CustomEvent<unknown>
      aboutMessage = typeof ce.detail === 'string' ? ce.detail : 'Lush app (early stage)'
      aboutOpen = true
    }
    window.addEventListener('lush:about', onDomAbout as EventListener)
    teardownDomAbout = () => {
      window.removeEventListener('lush:about', onDomAbout as EventListener)
    }

    const onDomMenuAction = (e: Event) => {
      const ce = e as CustomEvent<unknown>
      const detail = ce.detail
      if (!detail || typeof detail !== 'object') return
      const action = (detail as { action?: unknown }).action
      if (action === 'about') {
        openAbout()
      } else if (action === 'login') {
        void openLogin()
      } else if (action === 'open-editor') {
        void goto('/editor')
      } else if (action === 'open-yaml-file') {
        void openYamlFilePicker()
      } else if (action === 'open-yaml-sample') {
        setYamlFileContent(null)
        void goto('/yaml-explore')
      }
    }
    window.addEventListener('lush:menu-action', onDomMenuAction as EventListener)
    teardownDomMenuAction = () => {
      window.removeEventListener('lush:menu-action', onDomMenuAction as EventListener)
    }

    if (!tauriEventApi) return
    unlisten = await tauriEventApi.listen('lush:about', (evt) => {
      aboutMessage = typeof evt.payload === 'string' ? evt.payload : 'Lush app (early stage)'
      aboutOpen = true
    })
  })

  onDestroy(() => {
    unlisten?.()
    unlisten = null
    teardownDomAbout?.()
    teardownDomAbout = null
    teardownDomMenuAction?.()
    teardownDomMenuAction = null
    teardownPaletteHotkey?.()
    teardownPaletteHotkey = null
    teardownEscapeClose?.()
    teardownEscapeClose = null
  })
</script>

<div class="flex h-screen w-full flex-col">
  {#if !isTauri}
    <SvelteDevMenuBar spec={LUSH_MENU_BAR} homeLabel="lush" showHome={false} />
  {/if}

  <div class="flex-1 min-h-0 w-full overflow-hidden">
    {@render children?.()}
  </div>
</div>

<CommandPalette open={paletteOpen} onClose={closePalette} onExecute={executeCommand} />

{#if aboutOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/60 p-4"
    role="dialog"
    aria-modal="true"
    tabindex="0"
    onclick={(e) => {
      if (e.currentTarget === e.target) aboutOpen = false
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') aboutOpen = false
    }}
  >
    <div class="card w-full max-w-md space-y-3 p-4">
      <div class="text-lg font-semibold text-surface-50">About Lush</div>
      <div class="text-sm text-surface-200">{aboutMessage}</div>
      <div class="flex justify-end">
        <button type="button" class="btn btn-sm variant-filled" onclick={() => (aboutOpen = false)}>
          OK
        </button>
      </div>
    </div>
  </div>
{/if}

{#if loginOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/60 p-4"
    role="dialog"
    aria-modal="true"
    tabindex="0"
    onclick={(e) => {
      if (e.currentTarget === e.target) loginOpen = false
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') loginOpen = false
    }}
  >
    <form
      class="card w-full max-w-md space-y-3 p-4"
      onsubmit={(e) => {
        e.preventDefault()
        if (loginStatus.state === 'loaded' && !loginUserEmail) continueLogin()
      }}
    >
      <div class="text-lg font-semibold text-surface-50">Login</div>

      {#if loginStatus.state === 'loading'}
        <div class="text-sm text-surface-200">Checking session…</div>
      {:else if loginUserEmail}
        <div class="text-sm text-surface-200">
          You are already signed in as <span class="font-semibold">{loginUserEmail}</span>.
        </div>
      {:else}
        <div class="text-sm text-surface-200">Sign in with GitHub via WorkOS AuthKit.</div>
      {/if}

      {#if loginStatus.state === 'error'}
        <div class="text-sm text-error-300">Error: {loginStatus.message ?? 'Unknown error'}</div>
      {/if}

      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-sm variant-ghost-surface" onclick={() => (loginOpen = false)}>
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-sm variant-filled"
          disabled={loginStatus.state !== 'loaded' || loginUserEmail != null}
        >
          Continue with GitHub
        </button>
      </div>
    </form>
  </div>
{/if}
