import { writable } from 'svelte/store'

const { subscribe, set } = writable<string | null>(null)

export const yamlFileContent = { subscribe }

export function setYamlFileContent(content: string | null): void {
  set(content)
}
