# Lush Types Plan

- Expose YAML-oriented token types (`YamlTokenType`) and token shapes
  (`SusyNode`, `SusyLine`, `SusyLines`). (REVIEW)
- Provide helpers to build `SusyLines` from text (`tokenizeSusyLine`,
  `stringToSusyLines`) and to read token text (`susyText`). (REVIEW)
- Keep the package ESM-first with TypeScript source (`index.ts`) and
  matching JS build; publish types via `index.d.ts`.
- Add Vitest as the test runner (see `npm test`) for any future coverage.
- Coordinate with downstream repos (e.g. yaml) to mirror CST token types
  so their SusyLines output matches YAML's AST tokens. (REVIEW)
- Import and adapt stuff from ~/mine/rdln-lush/ to create a multiline shell
  structural editor congniscent of yaml. Import and adapt stuff
  from ~/mine/rdln-lush/ to create a multiline shell structural editor
  congniscent of yaml
