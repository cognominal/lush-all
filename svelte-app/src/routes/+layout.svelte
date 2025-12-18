<script lang="ts">
  import '../app.css'

  let aboutOpen = false
  let aboutMessage = 'Lush app (early stage)'

  let menuOpen = false
  let menuRoot: HTMLElement | null = null

  function openAbout() {
    menuOpen = false
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

  import { onDestroy, onMount } from 'svelte'

  let unlisten: Unlisten | null = null
  let teardownMenuGuards: (() => void) | null = null
  let teardownDomAbout: (() => void) | null = null
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

    if (!tauriEventApi) return
    unlisten = await tauriEventApi.listen('lush:about', (evt) => {
      aboutMessage = typeof evt.payload === 'string' ? evt.payload : 'Lush app (early stage)'
      aboutOpen = true
    })
  })

  onDestroy(() => {
    unlisten?.()
    unlisten = null
    teardownMenuGuards?.()
    teardownMenuGuards = null
    teardownDomAbout?.()
    teardownDomAbout = null
  })

  function installMenuGuards() {
    if (teardownMenuGuards) return

    const onPointerDown = (e: Event) => {
      if (!menuOpen) return
      const target = e.target
      if (!(target instanceof Node)) return
      if (menuRoot && menuRoot.contains(target)) return
      menuOpen = false
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (aboutOpen) {
        aboutOpen = false
        return
      }
      if (menuOpen) menuOpen = false
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)

    teardownMenuGuards = () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }

  $: if (!isTauri) installMenuGuards()
</script>

<div class="flex min-h-screen w-full flex-col">
  {#if !isTauri}
    <div class="sticky top-0 z-50 border-b border-surface-500/20 bg-surface-900/60 backdrop-blur">
      <div class="flex w-full items-center gap-2 px-4 py-2">
        <div class="relative" bind:this={menuRoot}>
          <button
            type="button"
            class="btn btn-sm variant-ghost-surface"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onclick={() => (menuOpen = !menuOpen)}
          >
            lush
          </button>
          {#if menuOpen}
            <div
              class="card absolute left-0 mt-2 w-44 overflow-hidden border border-surface-500/20 bg-surface-900/90 p-1 shadow-xl"
              role="menu"
              aria-label="lush menu"
            >
              <button
                type="button"
                class="btn btn-sm variant-ghost-surface w-full justify-start"
                role="menuitem"
                onclick={openAbout}
              >
                About
              </button>
            </div>
          {/if}
        </div>
        <div class="flex-1"></div>
      </div>
    </div>
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
