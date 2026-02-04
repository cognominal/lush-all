type ConfigurationStore = Map<string, unknown>
type ConfigurationListener = (event: ConfigurationChangeEvent) => void

const defaults = new Map<string, unknown>([
  ['editor.blockSelectHighlight', true]
])

const store: ConfigurationStore = new Map(defaults)
const listeners = new Set<ConfigurationListener>()

// Resolve a configuration key using the optional section prefix.
function resolveKey(section: string | undefined, key: string): string {
  if (!section) return key
  if (key.startsWith(`${section}.`)) return key
  return `${section}.${key}`
}

export type ConfigurationChangeEvent = {
  affectsConfiguration: (section: string) => boolean
}

export type Configuration = {
  get<T>(key: string, defaultValue?: T): T
  update<T>(key: string, value: T): void
}

// Create a configuration change event for a specific key.
function createChangeEvent(changedKey: string): ConfigurationChangeEvent {
  return {
    affectsConfiguration(section: string): boolean {
      if (changedKey === section) return true
      return changedKey.startsWith(`${section}.`)
    }
  }
}

// Notify all listeners of a configuration change.
function notifyChange(changedKey: string): void {
  const event = createChangeEvent(changedKey)
  listeners.forEach((listener) => {
    listener(event)
  })
}

// Create a VS Code-like configuration accessor for a given section.
function createConfiguration(section?: string): Configuration {
  return {
    // Read a configuration value with an optional default.
    get<T>(key: string, defaultValue?: T): T {
      const resolvedKey = resolveKey(section, key)
      if (store.has(resolvedKey)) return store.get(resolvedKey) as T
      if (defaults.has(resolvedKey)) return defaults.get(resolvedKey) as T
      return defaultValue as T
    },
    // Persist a configuration value for the current session.
    update<T>(key: string, value: T): void {
      const resolvedKey = resolveKey(section, key)
      store.set(resolvedKey, value)
      notifyChange(resolvedKey)
    }
  }
}

// Subscribe to configuration changes.
export function onDidChangeConfiguration(listener: ConfigurationListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Mirror VS Code's workspace.getConfiguration API shape.
export const workspace = {
  // Fetch a configuration accessor scoped to an optional section.
  getConfiguration(section?: string): Configuration {
    return createConfiguration(section)
  }
}
