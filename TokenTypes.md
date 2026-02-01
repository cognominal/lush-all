# Token Types Registry Spec

This spec defines a dynamic token kind/type registry using module
augmentation plus a runtime registry. Tokens are registered as a single
string with the format `Kind.Type` (dot-separated).

## Goals

- Register kind and type together via one call.
- Query existence of a kind, a type, or a kind+type pair.
- Keep TypeScript extensibility via module augmentation.

## Core Types

```ts
export interface TokenKindMap {}
export interface TokenTypeMap {}

export type TokenKindName = keyof TokenKindMap
export type TokenTypeName = keyof TokenTypeMap

export type TokenKindTypeName = `${TokenKindName}.${TokenTypeName}`
```

Module augmentation adds keys to `TokenKindMap` and `TokenTypeMap`.

Example (plugin module):

```ts
declare module 'lush-types' {
  interface TokenKindMap {
    AKind: true
  }
  interface TokenTypeMap {
    AType: true
  }
}
```

## Registration API

### registerTokenType

Signature:

```ts
export function registerTokenType(
  name: TokenKindTypeName
): TokenKindTypeName
```

Behavior:

- Accepts `Kind.Type`.
- Splits on the first `.`.
- Registers the full pair and each part in their registries.
- Returns the same value for convenient reuse.

Validation:

- Reject empty kind or type.
- Reject strings without `.`.
- Reject extra dots unless explicitly allowed by spec.

## Query API

```ts
export function hasTokenKind(name: TokenKindName): boolean
export function hasTokenType(name: TokenTypeName): boolean
export function hasTokenKindType(name: TokenKindTypeName): boolean
```

## Runtime Registry Shape

- `tokenKinds: Set<string>`
- `tokenTypes: Set<string>`
- `tokenKindTypes: Set<string>`

These sets are used only for runtime checks. TypeScript uses the
module-augmented unions for compile-time safety.

## Parsing Rules

- Input is a UTF-8 string, but only ASCII is expected.
- `Kind` and `Type` must be non-empty after trimming.
- The first `.` splits `Kind` and `Type`.
- Case is significant.

## Error Handling

`registerTokenType` throws an error for invalid input, so mistakes are
visible early in development.

## Usage Pattern

```ts
const MyToken = registerTokenType('AKind.AType')

if (hasTokenKind('AKind')) {
  // ...
}
```

## Notes

- This keeps existing data shape: `SusyNode.kind` and `SusyNode.type`
  remain strings but are type-checked through the unions above.
- If you need `Kind.Type` from a `SusyNode`, use a helper to format it
  consistently instead of concatenating ad hoc.
