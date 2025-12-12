# Lush Editor Plan (YAML structural editor)

- Runtime & tests
  - Use Bun for scripts; tests via Vitest.
  - Keep deps local: `yaml` (submodule) and `lush-types` (workspace).

- Goals
  - Borrow/adapt editing + event patterns from `~/mine/rdln-lush/src/tokenEdit.ts` and `src/editor.ts`.
  - Define `type MultiLines = Multiline[]` (alias of `TokenMultiLine`) and bootstrap with sample YAML tokens.
  - On Return inside a sequence item, splice an empty array item after the current line.
  - Maintain a second `Multiline` view showing the JS structure (like `console.dir` / `util.inspect` of parsed YAML).

- Architecture
  - State: `{ lines: MultiLines; jsView: MultiLines; cursor: { lineIdx; colIdx } }`.
  - Primary text derived from `lines` via `lineToText`; rebuild JS view by parsing YAML text to JS then `util.inspect` -> `stringToTokenMultiLine`.
  - Event helpers (borrowed patterns): insert text into a line, normalize positions, handle Return by `insertEmptyArrayItem`, move cursor to new line start.
  - Rendering (minimal): pure functions to render lines as strings and show cursor; no full TUI yet.

- Deliverables
  - Extend `src/yamlStructuralEditor.ts` with state helpers:
    - `lineToText`, `linesToYaml`, `buildJsViewMultiline`, `createInitialState`.
    - Event handlers: `insertTextAt`, `handleReturn`.
    - Rendering helpers: stringify lines + js view for console.
  - Add tests in `tests/`:
    - Sample multilines load.
    - Return splices empty item and advances cursor.
    - JS view multiline reflects parsed YAML and updates after edits.

- Validation
  - Run `bun run test` (yaml Jest + vitest suites).
  - Keep code in `src/` typed via tsconfig include.
