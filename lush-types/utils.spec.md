# sveltePick spec

## Purpose

Provide a helper to compile Svelte code and pick a nested value from the
compiler output using a dot-separated picker path.

## Location

Add the function to `~/lush-types/utils.ts`.

## Function name and signature

```
export function sveltePick(codeOrPath, picker: Picker, yaml = false) { ... }
```

## Behavior

- If `codeOrPath` is composed uniquely of `/`, `-`, `_`, `.`, or
  alphanumerics, treat it as a path to a Svelte file.
- Otherwise treat `codeOrPath` as Svelte source code.
- Compile the Svelte code.
- Use `picker` to descend into the compilation output.
  - `picker` is a string of integers/words separated by `.`.
  - A word assumes the current node is a map/object and is used as a key.
  - An integer assumes the current node is an array and is used as an index.
- Return the value accessed by the picker.
- if yaml == true convert the tree into yaml

## Tests

Use simple examples and a picker that returns attributes:

- `<h1 class="a b">foo</h1>`
- `<h1 foo="bar">text</h1>`
- `<h1 id="an_id">text</h1>`

Use Vitest in `lush-types`.

# yaml_weedout spec

## Purpose

Provide a helper to remove keys from a YAML structure and return YAML.

## Location

Add the function to `~/lush-types/utils.ts`.

## Function name and signature

```
export function yaml_weedout(input, keys: string[] | string) { ... }
```

## Behavior

- Accepts either a JS structure or a YAML string as `input`.
- Removes any object properties whose keys are in `keys`, recursively.
- `keys` may be a string[] or a space-separated string of key names.
- Returns the resulting YAML string.

## Tests

- Use `yaml_weedout` on the last `sveltePick` YAML test output to strip
  `name_loc`, `start`, and `end` keys.
- Assert the returned YAML string equals the expected stripped output.
