import { writable } from 'svelte/store'

export type Platform = 'mac' | 'win' | 'linux' | 'unknown'

export type Keybinding = {
  command: string
  key: string
  mac?: string
  linux?: string
  win?: string
  when?: string
}

export type WhenContext = Record<string, unknown>

export type Command = {
  command: string
  title: string
  category?: string
  f1?: boolean
  when?: string
  precondition?: string
  handler: () => void
}

const registry = new Map<string, Command>()
const order: string[] = []
const keybindings: Keybinding[] = []

const { subscribe, set } = writable<Command[]>([])

// Publish the registered commands in their insertion order.
function publish(): void {
  const list = order
    .map((commandId) => registry.get(commandId))
    .filter((command): command is Command => command != null)
  set(list)
}

// Register or update a command contribution.
export function registerCommand(command: Command): void {
  if (!registry.has(command.command)) {
    order.push(command.command)
  }
  registry.set(command.command, command)
  publish()
}

// Register a keybinding contribution.
export function registerKeybinding(keybinding: Keybinding): void {
  keybindings.push(keybinding)
}

// List all registered keybindings.
export function listKeybindings(): Keybinding[] {
  return [...keybindings]
}

// Return all commands in registration order.
export function listCommands(): Command[] {
  return order
    .map((commandId) => registry.get(commandId))
    .filter((command): command is Command => command != null)
}

// Decide whether a command should appear in the palette.
function isCommandVisible(command: Command, whenContext: WhenContext): boolean {
  if (command.f1 === false) return false
  return evaluateWhen(command.when, whenContext)
}

// Placeholder evaluator for VS Code-style when clauses.
export function evaluateWhen(when: string | undefined, _context: WhenContext): boolean {
  if (!when) return true
  return true
}

// Filter commands by palette visibility and query text.
export function filterCommands(
  commands: readonly Command[],
  query: string,
  whenContext: WhenContext
): Command[] {
  const visible = commands.filter((command) => isCommandVisible(command, whenContext))
  const needle = query.trim().toLowerCase()
  if (!needle) return [...visible]
  return visible.filter((command) => {
    const title = command.title.toLowerCase()
    const category = command.category?.toLowerCase() ?? ''
    const id = command.command.toLowerCase()
    return title.includes(needle) || category.includes(needle) || id.includes(needle)
  })
}

// Find the first keybinding that applies to a command.
function findKeybinding(commandId: string, whenContext: WhenContext): Keybinding | null {
  for (const binding of keybindings) {
    if (binding.command !== commandId) continue
    if (!evaluateWhen(binding.when, whenContext)) continue
    return binding
  }
  return null
}

// Detect the current platform for keybinding display.
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown'
  const platform = navigator.platform.toLowerCase()
  if (platform.includes('mac')) return 'mac'
  if (platform.includes('win')) return 'win'
  if (platform.includes('linux')) return 'linux'
  return 'unknown'
}

// Select the platform-appropriate keybinding string.
export function resolveKeybinding(keybinding: Keybinding, platform: Platform): string {
  if (platform === 'mac' && keybinding.mac) return keybinding.mac
  if (platform === 'win' && keybinding.win) return keybinding.win
  if (platform === 'linux' && keybinding.linux) return keybinding.linux
  return keybinding.key
}

// Format a keybinding string for display.
export function formatKeybindingLabel(
  commandId: string,
  whenContext: WhenContext,
  platform?: Platform
): string {
  const binding = findKeybinding(commandId, whenContext)
  if (!binding) return 'Unbound'
  const resolved = resolveKeybinding(binding, platform ?? detectPlatform())
  return resolved
    .split('+')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join('+')
}

export const commandsStore = { subscribe }
