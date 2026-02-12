# Lush monorepo

This a [monorepo](https://en.wikipedia.org/wiki/Monorepo#) for lush.
See [blurb](./docs/blurb.md) to know that blush is about
At this stage the docs is for dev(s).
I am building tools to scaffold the final app. They parse back and
forth the acorn format and my SusyNode tree in yaml to see what
I do. I have svelte routes to do that.

## install

We suppose the [bun](https://en.wikipedia.org/wiki/Bun_(software))
package manager installed.

Run `bun install:all`
Run `bun dev`

## goal

For the general long term goals (see  [blurb](./docs/blurb.md))

The goal is to get more organized than `rd-line-lush` (a previous attempt which
targeted the terminal) to be able
to bring in `jq` and `yaml` in my would-be lush language.
Yaml parsing is done using the `lush` branch of my  fork of [yaml] which
uses  `lush-types/`

## next step

Unparse a svelte augmented Acorn tree into an `SusyNode` tree
See [unparse](./lush-types/unparse.md)

## Git hooks

To enforce tests before pushing, copy the shared pre-push hook template:

```bash
cp scripts/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Current deliverable

Only dev mode so far.
In the [sveltekit](https://svelte.dev) app, the menu bar is built using
[skeleton](https://v2.skeleton.dev/) widgets.
In the  [tauri](https://v2.tauri.app/start/) app, the system menu bar is used
using rust API.
Beyond that the 2 apps are identical.
Currently there is is only "Lush/About" that displays a pop up.

When lish will run in terminal outside of svelte of tauri, it will
have its own system of menus.

There are package.json build scripts for different combinations
of software/hardware platforms. They are untested.

## svelte app

After install. Run `bun run dev`
See [svelte-app/app.md](svelte-app/app.md])

## tauri app

## Auth docs

- `auth-workos-github.md` — WorkOS AuthKit + GitHub login (SvelteKit +
  Tauri dev)
- `tauri-auth-server.md` — “no limitation” Tauri build that bundles a
  local server (`bun run build:tauri:auth`)
- `docs/highlighting-themes.md` — Highlight selector keys, precedence,
  and theme style chains.

## Monorepo Layout

- `lush-types` is a local npm package to define types used everywhere else

= `yaml/` is  a copy of my  `lush` branch of my local fork of
[yaml](https://github.com/eemeli/yaml) to parse a yaml string into a
`TokenMultiline` structure

- `lush-term-editor/` is a terminal based structural editor.

Later (long term) will be :

- `lush-codemirror/`  same as lush-term-editor but for codemirror
- 'lush-nvim/'  speculative. Same as lush-term-editor but for nvim
- 'lush-monaco/'  speculative. Same as lush-term-editor but for monaco
- `lush-svelte/`       will use lush-code-mirror, probably for notebook.
   Editing cells should be toggled between web and terminal.
   Nu array output could be rendered as a html array bridging the gap
   between GUI and TUI.

## short term

At this point we programmatically edit yaml data and learn coding with codex.
No interactive edit and display yet.

The goal is to edit the yaml sample below and simulate the typing return to
insert a new item below the current one in an sequence.
The next step will be more difficult : to do the same in a map.
With a sequence item we can get away with an empty item that stands for null.
For a mapping we will have to use placeholders.

The sample data is a map in a sequence

```yaml
- toto
- a: b
  c: d

```

## Later steps

-A display cell will be outputted using `util.inspect` as the editing cell
is modified. Key placeholder will be displayed as key-placeholder `n` to avoid
duplicate.

- a breadcrumb field will be displayed in the status line at the bottom of
