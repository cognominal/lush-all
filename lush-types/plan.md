# Lush Types Plan

- Expose YAML-oriented token types (`YamlTokenType`) and token shapes
  (`InputToken`, `TokenLine`, `TokenMultiLine`).
- Provide helpers to build `TokenMultiLine` from text (`tokenizeLine`,
  `stringToTokenMultiLine`) and to read token text (`tokenText`).
- Keep the package ESM-first with TypeScript source (`index.ts`) and
  matching JS build; publish types via `index.d.ts`.
- Add Vitest as the test runner (see `npm test`) for any future coverage.
- Coordinate with downstream repos (e.g. yaml) to mirror CST token types
  so their TokenMultiLine output matches YAML's AST tokens.
- Import and adapt stuff from ~/mine/rdln-lush/ to create a multiline shell
  structural editor congniscent of yaml. Import and adapt stuff
  from ~/mine/rdln-lush/ to create a multiline shell structural editor
  congniscent of yaml
