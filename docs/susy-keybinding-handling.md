# Susy Keybinding Handling

This document defines keybinding behavior for the Susy structural editor.

## Modes

- `normal`: tree navigation and structural selection.
- `insert`: text editing inside a focused token.

## Normal mode keybindings

- `i`: enter insert mode at the current path.
- `Enter`: descend to a child path.
- `Tab`: move to next input token.
- `Shift+Tab`: move to previous input token.
- `Escape`: enlarge selection to the parent path.

`Escape` uses the current structural path and moves focus one level up.
When already at root, focus does not change.

## Insert mode keybindings

- `Escape`: return to normal mode.
- Printable keys: insert text at current token cursor.

## Sync with Breadcrumb and Susy YAML panel

- Structural editor focus updates emit `onFocusPath`.
- Breadcrumbs are rebuilt from `currentPath`.
- `EditorWorkspace` forwards focus to `activePath`.
- `SusyYamlPanel` highlights and scrolls to that path span.

Because `Escape` in normal mode now updates focus to the parent path, the
breadcrumb bar and Susy YAML panel update automatically with the same path.
