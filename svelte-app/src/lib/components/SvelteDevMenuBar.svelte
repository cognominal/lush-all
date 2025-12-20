<script lang="ts">
  import type { MenuActionEventDetail, MenuBarSpec, MenuItem, MenuMenu } from 'lush-types'
  import { onDestroy, onMount } from 'svelte'

  export let spec: MenuBarSpec
  export let homeLabel = 'lush'
  export let showHome = true

  let openMenuId: string | null = null
  let root: HTMLElement | null = null

  function isSubmenu(item: MenuItem): item is MenuMenu {
    return item.kind === 'submenu'
  }

  function closeMenus() {
    openMenuId = null
  }

  function emit(detail: MenuActionEventDetail) {
    window.dispatchEvent(new CustomEvent<MenuActionEventDetail>('lush:menu-action', { detail }))
  }

  function clickItem(item: MenuItem) {
    if (item.kind !== 'action') return
    if (item.disabled) return
    emit({ action: item.action })
    closeMenus()
  }

  function onMenuButtonClick(menuId: string) {
    openMenuId = openMenuId === menuId ? null : menuId
  }

  function installGuards() {
    const onPointerDown = (e: Event) => {
      if (!openMenuId) return
      const target = e.target
      if (!(target instanceof Node)) return
      if (root && root.contains(target)) return
      closeMenus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      closeMenus()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }

  let teardown: (() => void) | null = null
  onMount(() => {
    teardown = installGuards()
  })
  onDestroy(() => {
    teardown?.()
    teardown = null
  })
</script>

<nav class="sk-nav" aria-label="Primary" bind:this={root}>
  {#if showHome}
    <a class="home-link" href="/" aria-label={homeLabel} title={homeLabel}>
      {homeLabel}
    </a>
  {/if}

  <div class="menus">
    {#each spec.menus as maybeMenu (maybeMenu.id)}
      {#if isSubmenu(maybeMenu)}
        <div class="dropdown">
          <button
            type="button"
            class="menu-button"
            aria-haspopup="menu"
            aria-expanded={openMenuId === maybeMenu.id}
            onclick={() => onMenuButtonClick(maybeMenu.id)}
          >
            <span>{maybeMenu.label}</span>
            <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6.7 9.3a1 1 0 0 1 1.4 0L12 13.2l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.7a1 1 0 0 1 0-1.4Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {#if openMenuId === maybeMenu.id}
            <div class="dropdown-content" role="menu" aria-label={maybeMenu.label}>
              <div class="hover-menu">
                {#each maybeMenu.items as item (item.id)}
                  {#if item.kind === 'separator'}
                    <div class="separator" role="separator"></div>
                  {:else if item.kind === 'action'}
                    <button
                      type="button"
                      class="menu-item"
                      role="menuitem"
                      disabled={item.disabled === true}
                      onclick={() => clickItem(item)}
                    >
                      {item.label}
                    </button>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  <div class="spacer"></div>
</nav>

<style>
  .sk-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid rgba(var(--color-surface-500) / 0.25);
    background: rgba(var(--color-surface-900) / 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    user-select: none;
  }

  .home-link {
    display: inline-flex;
    align-items: center;
    height: 2.25rem;
    padding: 0 0.75rem;
    border-radius: 9999px;
    color: rgba(var(--color-surface-50) / 1);
    text-decoration: none;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  .home-link:hover {
    background: rgba(var(--color-surface-50) / 0.08);
  }

  .menus {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .dropdown {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .menu-button {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    height: 2.25rem;
    padding: 0 0.75rem;
    border-radius: 9999px;
    color: rgba(var(--color-surface-50) / 1);
    background: transparent;
    border: 0;
    cursor: pointer;
    font-weight: 600;
  }

  .menu-button:hover,
  .menu-button[aria-expanded='true'] {
    background: rgba(var(--color-surface-50) / 0.08);
  }

  .chevron {
    opacity: 0.85;
  }

  .dropdown-content {
    position: absolute;
    left: 0;
    top: calc(100% + 0.5rem);
    min-width: 14rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(var(--color-surface-500) / 0.25);
    background: rgba(var(--color-surface-900) / 0.92);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.35),
      0 2px 8px rgba(0, 0, 0, 0.25);
    overflow: hidden;
  }

  .hover-menu {
    padding: 0.5rem;
  }

  .menu-item {
    width: 100%;
    display: block;
    text-align: left;
    padding: 0.75rem 0.75rem;
    border-radius: 0.5rem;
    border: 0;
    background: transparent;
    color: rgba(var(--color-surface-50) / 1);
    font-weight: 600;
    cursor: pointer;
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .menu-item:not(:disabled):hover {
    background: rgba(var(--color-surface-50) / 0.08);
  }

  .separator {
    height: 1px;
    margin: 0.5rem 0.25rem;
    background: rgba(var(--color-surface-500) / 0.25);
  }

  .spacer {
    flex: 1;
  }
</style>
