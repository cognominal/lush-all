export type PrefixKeyHandler<TPrefix extends string> = {
  setPrefix: (prefix: TPrefix) => void
  consume: (prefix: TPrefix, action: () => boolean) => boolean
  clear: () => void
  getPrefix: () => TPrefix | null
}

// Create a small prefix-key state machine with timeout handling.
export function createPrefixKeyHandler<TPrefix extends string>(
  timeoutMs: number
): PrefixKeyHandler<TPrefix> {
  let pendingPrefix: TPrefix | null = null
  let pendingTimer: ReturnType<typeof setTimeout> | null = null

  // Clear the pending prefix and its timer.
  const clear = (): void => {
    pendingPrefix = null
    if (pendingTimer) clearTimeout(pendingTimer)
    pendingTimer = null
  }

  // Schedule a timeout to clear the pending prefix.
  const scheduleTimeout = (): void => {
    if (pendingTimer) clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => {
      clear()
    }, timeoutMs)
  }

  // Store a prefix key and start the timeout.
  const setPrefix = (prefix: TPrefix): void => {
    pendingPrefix = prefix
    scheduleTimeout()
  }

  // Consume a prefix if it matches and run the supplied action.
  const consume = (prefix: TPrefix, action: () => boolean): boolean => {
    if (pendingPrefix !== prefix) return false
    clear()
    return action()
  }

  // Expose the current prefix for inspection.
  const getPrefix = (): TPrefix | null => pendingPrefix

  return {
    setPrefix,
    consume,
    clear,
    getPrefix
  }
}
