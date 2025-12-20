import { writable } from 'svelte/store'

export type Command = {
  id: string
  label: string
  group?: string
  handler: () => void
}

const registry = new Map<string, Command>()
const order: string[] = []

const { subscribe, set } = writable<Command[]>([])

function publish(): void {
  const list = order
    .map((id) => registry.get(id))
    .filter((command): command is Command => command != null)
  set(list)
}

export function registerCommand(command: Command): void {
  if (!registry.has(command.id)) {
    order.push(command.id)
  }
  registry.set(command.id, command)
  publish()
}

export function listCommands(): Command[] {
  return order
    .map((id) => registry.get(id))
    .filter((command): command is Command => command != null)
}

export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...commands]
  return commands.filter((command) => command.label.toLowerCase().includes(needle))
}

export const commandsStore = { subscribe }
