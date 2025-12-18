<script lang="ts">
  import '../app.css'

  let aboutOpen = false
  let aboutMessage = 'Lush app (early stage)'

  function openAbout() {
    aboutMessage = 'Lush app (early stage)'
    aboutOpen = true
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

  let unlisten: Unlisten | null = null
  let teardownDomAbout: (() => void) | null = null
  let teardownDomMenuAction: (() => void) | null = null
  onMount(async () => {
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
  })
</script>

<div class="flex min-h-screen w-full flex-col">
  {#if !isTauri}
    <SvelteDevMenuBar spec={LUSH_MENU_BAR} homeLabel="lush" />
  {/if}

  <div class="flex-1 min-h-0 w-full">
    <slot />
  </div>
</div>

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
