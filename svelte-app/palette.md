# Palette a la vscode

## Objective

Create a VSCode-style command palette using Skeleton widgets. The palette is
invoked with `F1`, shows registered commands, filters as the user types, and
executes the selected command on Enter.

## Integration Requirements

- Use Skeleton UI components for the modal/dialog and list items.
- Bind `F1` globally to open the palette.
- Provide a command registry with:
  - `id` (string)
  - `label` (string)
  - `group` (optional string)
  - `handler` (function)
- The first registered command must be the menu-triggered command from the
  Lush menu ("editor" or other menu actions).

## UX/Behavior

- Palette opens centered with a text input focused.
- Typing filters commands by substring match on label (case-insensitive).
- Up/Down arrows move selection, Enter executes, Escape closes.
- If no results, show a short empty-state message.
- Clicking a command executes it and closes the palette.

## Data Flow

- A `CommandRegistry` module stores commands and exposes:
  - `register(command)`
  - `list()` (all commands)
  - `search(query)` (filtered commands)
- Menu actions should register corresponding commands on app init.

## Svelte Structure (proposed)

- `src/lib/logic/commands.ts` (registry)
- `src/lib/components/CommandPalette.svelte` (UI)
- `src/routes/+layout.svelte` (global hotkey + palette mount)

## Notes

- Use only SvelteKit + Skeleton widgets; no additional UI frameworks.
- Keep the palette logic UI-agnostic where possible for reuse in Tauri and web.
