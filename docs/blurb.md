# Aspirational Blurb

Fulfilling Larry Wall's aspiration of meshing language and evolving them.

- from nushell and jq, and using coroutines, it supports typed pipes
(done for json) of
  infinite steams.
- with an adapted YAML (WIP) called lyaml (for lush yaml),
  to interpolate or match variables.
- styled fonts as syntax as a vector of better expressivity,
- lushed, a mostly structural editor. The ecosystem had to thought with the language.

## images

lyaml interpolation

pipe image there

## Deliverables and modes

- nuLush: A sveltekit supporting lushed.
- tauLush: same but as an app runnning in tauri.

Lush as many avatars or modes, lish as a unix shell, leste
as leaner svelte.

## Logical architecture

Lush is an AST-first, projectional language system centered on a canonical
model called Astre. A Program susy is edited with a suzyed like lushed. A
susy is a styled surface syntax that uses indentation and font style as
primary channels, while relegating color and emphasis to secondary channels.

TBD: The lushed editor maintains a continuous, lossless correspondence
between Susy and Astre, ensuring that the program is always structurally
valid. Stable node identities (naids) and symbol identities (saids) enable
reliable structural diffing, lineage tracking via paids, and robust
refactoring semantics.
I

## GUI and TUI

Lush targets rich GUI environments (e.g., Monaco (TBD), CodeMirror (in
progress)) as the primary host for Susy. But we constrain it (only styled
monospace fonts) so that TUI/terminal environments would not be degraded
projections due to their limited channel budget. Code generation proceeds by
generating a target Acorn AST from Astre, contrasting with pipelines such as
Svelte that lack persistent identity.

Lush as a language, support typed pipe (a la jq or nushell) and uses
coroutine so streams of indefinite length can be supported.
