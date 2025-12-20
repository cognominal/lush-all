<script lang="ts">
  import '../app.css'

  let aboutOpen = false
  let aboutMessage = 'Lush app (early stage)'

  let loginOpen = false
  let loginStatus: { state: 'idle' | 'loading' | 'loaded' | 'error'; message?: string } = {
    state: 'idle'
  }
  let loginUserEmail: string | null = null

  function openAbout() {
    aboutMessage = 'Lush app (early stage)'
    aboutOpen = true
  }

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
  import { registerCommand, type Command } from '$lib/logic/commands'
  import { setYamlFileContent } from '$lib/logic/yamlFile'

  let unlisten: Unlisten | null = null
  let teardownDomAbout: (() => void) | null = null
  let teardownDomMenuAction: (() => void) | null = null
  let teardownPaletteHotkey: (() => void) | null = null
  let paletteOpen = false

  function openPalette() {
    paletteOpen = true
  }

  function closePalette() {
    paletteOpen = false
  }

  function executeCommand(command: Command) {
    command.handler()
    closePalette()
  }

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

  function registerMenuCommands() {
    registerCommand({
      id: 'open-yaml-file',
      label: 'Open yaml file...',
      group: 'Lush',
      handler: () => {
        void openYamlFilePicker()
      }
    })

    registerCommand({
      id: 'open-editor',
      label: 'Open editor',
      group: 'Lush',
      handler: () => {
        void goto('/editor')
      }
    })

    registerCommand({
      id: 'open-yaml-sample',
      label: 'Open yaml_sample',
      group: 'Lush',
      handler: () => {
        setYamlFileContent(null)
        void goto('/')
      }
    })

    registerCommand({
      id: 'login',
      label: 'Login',
      group: 'Lush',
      handler: () => {
        void openLogin()
      }
    })

    registerCommand({
      id: 'about',
      label: 'About Lush',
      group: 'Lush',
      handler: () => {
        openAbout()
      }
    })
  }

  function installPaletteHotkey() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F1') return
      event.preventDefault()
      openPalette()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }
  onMount(async () => {
    registerMenuCommands()
    teardownPaletteHotkey = installPaletteHotkey()
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
        void goto('/')
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
  })
</script>

<div class="flex min-h-screen w-full flex-col">
  {#if !isTauri}
    <SvelteDevMenuBar spec={LUSH_MENU_BAR} homeLabel="lush" showHome={false} />
  {/if}

  <div class="flex-1 min-h-0 w-full">
    <slot />
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
