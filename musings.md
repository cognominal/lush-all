A place for stuff that have not find places elsewhere.
Probably semi coherent ramblings;``

## Compilation vs interpretation

Note: this discussion goes nowhere...

In a compiled language, a compilation unit is a string. It is parsed into a
CST (concrete syntax tree), then transformed into an AST (abstract syntax
tree) for algebraic transformations and code generation. Possibly multiple object
files are later linked into an executable. In C-like languages, the
compilation unit is not the raw source; it is the preprocessed form by the
preprocessor `cpp`.

With an AST, the direct connection to the original source is largely lost,
so error reporting is usually anchored on the CST.

In an interpreted language like TS/JS, there is no object code. The compilation
units are packages and they are processed together, possibly with different
options driven by each package's `package.json`.

For now, we assume there is no preprocessing pass.


