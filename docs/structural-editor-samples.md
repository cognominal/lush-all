# Structural Editor Samples

## Sample Location

Sample files live in:

`/Users/cog/mine/lush-all/svelte-app/src/lib/samples`

## How Samples Are Loaded

`StructuralEditor` scans the samples folder with a `glob` that matches
`*.svelte`, `*.js`, `*.ts`, `*.yaml`, and `*.ruleproj`. Each file
becomes an option in the sample picker.

## How Languages Are Listed

The language picker is built from the file extensions that exist in the
samples folder. If an extension is present, it appears in the language
list.

## How Projection Is Chosen

Projection is selected by file extension:

- `svelte` uses `susySvelteProjection`.
- `js` uses `susyJsProjection`.
- `ts` uses `susyTsProjection`.
- `yaml` uses `susyYamlProjection`.
- `ruleproj` uses `susyRuleprojProjection`.

If a sample file has an extension without a projection mapping, the
sample is shown as disabled and cannot be selected.
