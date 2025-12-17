# Lush monorepo

This a [monorepo](https://en.wikipedia.org/wiki/Monorepo#) for lush.

## goal

The goal is to get more organized than `rd-line-lush` to be able
to bring in `jq` and `yaml` in my would-be lush language.
Yaml parsing is done using the `lush` branch of my  fork of [yaml] which
uses  `lush-types/`

## install

We suppose the [bun](https://en.wikipedia.org/wiki/Bun_(software))
package manager installed.

Run `bun install:all`

## Current deliverable

Only dev mode so far.
In the [sveltekit](https://svelte.dev) app, the menu bar is built using [skeleton](https://v2.skeleton.dev/)
widgets.
In the  [tauri](https://v2.tauri.app/start/) app, the system menubar is used using
rust API.
Beyond that the 2 apps are identical.
Currenly there is is only "Lush/About" that displays a popup.

When lish will run in terminal outside of svelte of tauri, it will
have its onw system of menus.

There are package.json build scripts for different combinations
of software/hardware platforms. They are untested.

## svelte app

After install. Run `bun run dev`
See [svelte-app/app.md](svelte-app/app.md])

## tauri app

## Monorepo Layout

- `lush-types` is a local npm package to define types used everywhere else
= `yaml/` is a  it is a copy of my  `lush` branch of my local fork of [yaml](https://github.com/eemeli/yaml)
  to parse a yaml string into a `TokenMultiline` structure
- `lush-term-editor/` is a terminal based structural editor.

Later (long term) will be :

- `lush-codemirror/`  same as lush-term-editor but for codemirror
- 'lush-nvim/'  speculative. same as lush-term-editor but for nvim
- 'lush-monaco/'  speculative. same as lush-term-editor but for monaco
- `lush-svelte/`       will use lush-code-mirror, probably for notebook.
   editing cells should be toggled between web and terminal.
   style. nu array output could be rendered as a html array.

## short term

At this point we programatically edit yaml data and learn coding with codex.
No interactive edit and display yet.

The goal is to edit the yaml sample below and simulate the typing return to insert
a new item below the current one in an sequence.
The next step will be more difficult : to do the same in a map.
With a sequence item we can get away with an empty item that stands for null.
For a mapping we will have to use placeholders.

The sample data is a map in a sequence

```yaml
- toto
- a: b
  c: d

```

# Later steps

-A display cell will be outputed using `util.inspect` as the editing cell
is modified. key placeholder will be displayed as key-placeholder`n` to avoid
duplicate.

- a breadcrumb field will be displayed in the status line at the bottom of
the termonal

Note : codex has inserted stuff from `rdln-lush`
which is not yet relevant here. We keep it anyway.
