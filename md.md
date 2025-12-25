Prompt to regenerate: Generate five-sentence summaries for each markdown file, excluding summaries/. Start each summary with 'Title: the_title.' (not counted against the five sentences). Use linked section titles formatted as '## [path](path) (modified X hours/days/months/years ago)'. Put all node_modules markdown summaries into node-modules-summary.md only, with section titles formatted as '## [module_name version modified X ago](module_path)'.

## [AGENTS.md](AGENTS.md) (modified 1 day ago)

Title: Agent instructions (Codex).
It opens by stating: - TypeScript-only changes should stay `strict` and must not use `any` (prefer `unknown` + narrowing). Key sections include: Stack + constraints, Repo layout, Common commands (run from repo root), Validation expectations (before considering work “done”). The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for the repo root work. It is best read as a documentation note entry within this repository.

## [README.md](README.md) (modified 2 days ago)

Title: Lush monorepo.
It opens by stating: This a [monorepo](https://en.wikipedia.org/wiki/Monorepo#) for lush. Key sections include: goal, next step, install, Current deliverable. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for the repo root work. It is best read as a overview entry within this repository.

## [auth-workos-github.md](auth-workos-github.md) (modified 4 days ago)

Title: GitHub authentication via WorkOS (AuthKit) — Lush.
It opens by stating: This repo uses **WorkOS AuthKit** for authentication, with **GitHub** as the initial OAuth provider. Key sections include: What gets added, Routes, Cookies, Setup (local dev). The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for the repo root work. It is best read as a documentation note entry within this repository.

## [data/svelte2leste/README.md](data/svelte2leste/README.md) (modified 1 day ago)

Title: Rule based transformations from svelte to leste.
It opens by stating: It is a special case of a posh susyfication, that is translating an astre into an InputToken tree. Key sections include: rules. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for data work. It is best read as a overview entry within this repository.

## [lush-term-editor/plan.md](lush-term-editor/plan.md) (modified 11 days ago)

Title: Lush Editor Plan (YAML structural editor).
It opens by stating: - Runtime & tests - Use Bun for scripts; tests via Vitest. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for lush-term-editor work. It is best read as a plan entry within this repository.

## [lush-types/lush2svelte.spec.md](lush-types/lush2svelte.spec.md) (modified 23 hours ago)

Title: lush2svelte spec.
It opens by stating: Convert a Leste (lush) representation into a Svelte-compatible structure and describe how poshification renders Leste using the highlight YAML. Key sections include: Purpose, Notes on types, CompileResult (successful), Function name and signature. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for lush-types work. It is best read as a specification entry within this repository.

## [lush-types/plan.md](lush-types/plan.md) (modified 14 days ago)

Title: Lush Types Plan.
It opens by stating: - Expose YAML-oriented token types (`YamlTokenType`) and token shapes (`InputToken`, `TokenLine`, `TokenMultiLine`). It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for lush-types work. It is best read as a plan entry within this repository.

## [lush-types/utils.spec.md](lush-types/utils.spec.md) (modified 1 day ago)

Title: sveltePick spec.
It opens by stating: Provide a helper to compile Svelte code and pick a nested value from the compiler output using a dot-separated picker path. Key sections include: Purpose, Location, Function name and signature, Behavior. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for lush-types work. It is best read as a specification entry within this repository.

## [menu-api.md](menu-api.md) (modified 4 days ago)

Title: Lush menu “upper API”.
It opens by stating: Goal: define one app-level menu model + one action event so both the **web (non‑Tauri)** UI menu and the **Tauri native** menu can drive the same behavior. Key sections include: Menu model, Action dispatch, Current action IDs, Current wiring. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for the repo root work. It is best read as a documentation note entry within this repository.

## [plan.md](plan.md) (modified 8 days ago)

Title: Plan: SvelteKit YAML + Lush Breadcrumb Prototype.
It opens by stating: Create a SvelteKit app in `svelte-app/` that: - Shows a CodeMirror editor containing `YAML_SAMPLE`. Key sections include: Goal, End Goal, Approach, Deliverables / Key Files. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for the repo root work. It is best read as a plan entry within this repository.

## [svelte-app/README.md](svelte-app/README.md) (modified 8 days ago)

Title: README.
It opens with a brief note that sets the context. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for svelte-app work. It is best read as a overview entry within this repository.

## [svelte-app/app.md](svelte-app/app.md) (modified 8 days ago)

Title: App Overview.
It opens by stating: This folder contains a SvelteKit app that prototypes a YAML “structural editor” UI backed by `yaml/` (this repo) + `lush-types/`. Key sections include: What You See, Left pane: YAML editor (CodeMirror), Breadcrumb bar (under the editor), Right pane: selected `InputToken` as YAML. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for svelte-app work. It is best read as a app note entry within this repository.

## [svelte-app/palette.md](svelte-app/palette.md) (modified 2 days ago)

Title: Palette a la vscode.
It opens by stating: Create a VSCode-style command palette using Skeleton widgets. Key sections include: Objective, Integration Requirements, UX/Behavior, Data Flow. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for svelte-app work. It is best read as a design note entry within this repository.

## [svelte-app/plan.md](svelte-app/plan.md) (modified 10 days ago)

Title: Plan: SvelteKit YAML + Lush Breadcrumb Prototype.
It opens by stating: Create a SvelteKit app in `svelte-app/` that: - Shows a CodeMirror editor containing `YAML_SAMPLE`. Key sections include: Goal, Approach, Deliverables / Key Files. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for svelte-app work. It is best read as a plan entry within this repository.

## [svelte-app/size.md](svelte-app/size.md) (modified 8 days ago)

Title: size.
It opens by stating: Biggest offenders in HEAD (examples): - yaml/tests/json-test-suite/parsers/test_Squeak_JSON_tonyg/Squeak5.1-16549-32bit.image (~35 MB) - Many compiled binaries under yaml/tests/json-test-suite/parsers/\*_/bin/_ (5–9 MB each). It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for svelte-app work. It is best read as a design note entry within this repository.

## [svelte-codemirror/spec.md](svelte-codemirror/spec.md) (modified 2 days ago)

Title: structural-editing.md.
It opens by stating: Write a package in the current monorepo folder. Key sections include: 1. Objective, Updated objective (reformulated), Integration with svelte-app/, 2. Core Data Model. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for svelte-codemirror work. It is best read as a specification entry within this repository.

## [svelte-codemirror/src/unparse.md](svelte-codemirror/src/unparse.md) (modified 2 days ago)

Title: unparse.
It opens by stating: We want to unparse an augmented acorn tree (AAT) generated by svelte in a susie representation based on a InputToken tree (ITT). It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for svelte-codemirror work. It is best read as a documentation note entry within this repository.

## [tauri-auth-server.md](tauri-auth-server.md) (modified 4 days ago)

Title: Tauri “AuthKit production server” build.
It opens by stating: Tauri normally bundles a **static** frontend (files) and loads them directly inside the webview. Key sections include: How it works, Build time, Runtime, Requirements. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for the repo root work. It is best read as a documentation note entry within this repository.

## [tauri-svelte-app/README.md](tauri-svelte-app/README.md) (modified 8 days ago)

Title: README.
It opens by stating: • To run tauri-svelte-app as a native desktop app (Tauri v2), you run the Rust/Tauri runner, which will start your Svelte dev server per tauri-svelte-app/src-tauri/ tauri.conf.json. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for tauri-svelte-app work. It is best read as a overview entry within this repository.

## [tauri-svelte-app/plan.md](tauri-svelte-app/plan.md) (modified 8 days ago)

Title: Plan: Wrap `svelte-app/` in a Tauri shell.
It opens by stating: Make the existing SvelteKit UI in `svelte-app/` runnable as a desktop app by adding a Tauri project in `tauri-svelte-app/`. Key sections include: Goal, What was added, Frontend changes (to support Tauri), How the Tauri wrapper is wired. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for tauri-svelte-app work. It is best read as a plan entry within this repository.

## [yaml/.github/ISSUE_TEMPLATE/bug_report.md](yaml/.github/ISSUE_TEMPLATE/bug_report.md) (modified 14 days ago)

Title: bug_report.
It opens by stating: --- name: Bug report about: Report an issue to help us improve the library. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/.github/ISSUE_TEMPLATE/feature_request.md](yaml/.github/ISSUE_TEMPLATE/feature_request.md) (modified 14 days ago)

Title: feature_request.
It opens by stating: --- name: Feature request about: Suggest an idea for this library. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/README.md](yaml/README.md) (modified 14 days ago)

Title: YAML <a href="https://www.npmjs.com/package/yaml"><img align="right" src="https://badge.fury.io/js/yaml.svg" title="npm package" /></a>.
It opens by stating: `yaml` is a definitive library for [YAML](https://yaml.org/), the human friendly data serialization standard. Key sections include: API Overview, Parse & Stringify, Documents, Content Nodes. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/docs-slate/CHANGELOG.md](yaml/docs-slate/CHANGELOG.md) (modified 14 days ago)

Title: Changelog.
It opens by stating: *January 31, 2023* * Fix Vagrantfile gem install for ruby >= 2.6 (thanks @Cyb0rk) * Disable file watcher in run_build() for sake of qemu on arm64 (thanks @anapsix). Key sections include: Version 2.13.1, Version 2.13.0, Version 2.12.0, Version 2.11.0. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a changelog entry within this repository.

## [yaml/docs-slate/CODE_OF_CONDUCT.md](yaml/docs-slate/CODE_OF_CONDUCT.md) (modified 14 days ago)

Title: Contributor Covenant Code of Conduct.
It opens by stating: In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation. Key sections include: Our Pledge, Our Standards, Our Responsibilities, Scope. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a code of conduct entry within this repository.

## [yaml/docs-slate/README.md](yaml/docs-slate/README.md) (modified 14 days ago)

Title: README.
It opens by stating: <p align="center"> <img src="https://raw.githubusercontent.com/slatedocs/img/main/logo-slate.png" alt="Slate: API Documentation Generator" width="226"> <br>. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/docs/01_intro.md](yaml/docs/01_intro.md) (modified 14 days ago)

Title: YAML.
It opens by stating: > To install: > To use: `yaml` is a definitive library for [YAML](http://yaml.org/), the human friendly data serialization standard. Key sections include: API Overview. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/02_parse_stringify.md](yaml/docs/02_parse_stringify.md) (modified 14 days ago)

Title: Parse & Stringify.
It opens by stating: At its simplest, you can use `YAML.parse(str)` and `YAML.stringify(value)` just as you'd use `JSON.parse(str)` and `JSON.stringify(value)`. Key sections include: YAML.parse, YAML.stringify. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/03_options.md](yaml/docs/03_options.md) (modified 14 days ago)

Title: Options.
It opens by stating: The options supported by various `yaml` features are split into various categories, depending on how and where they are used. Key sections include: Parse Options, Document Options, Schema Options, CreateNode Options. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/04_documents.md](yaml/docs/04_documents.md) (modified 14 days ago)

Title: Documents.
It opens by stating: In order to work with YAML features not directly supported by native JavaScript data types, such as comments, anchors and aliases, `yaml` provides the `Document` API. Key sections include: Parsing Documents, Creating Documents, Document Methods, Stream Directives. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/05_content_nodes.md](yaml/docs/05_content_nodes.md) (modified 14 days ago)

Title: Content Nodes.
It opens by stating: After parsing, the `contents` value of each `YAML.Document` is the root of an [Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) of nodes representing the document (or `null` for an empty document). Key sections include: Scalar Values, Collections, Alias Nodes, Creating Nodes. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/06_custom_tags.md](yaml/docs/06_custom_tags.md) (modified 14 days ago)

Title: Custom Data Types.
It opens by stating: The easiest way to extend a [schema](#data-schemas) is by defining the additional **tags** that you wish to support. Key sections include: Built-in Custom Tags, YAML 1.2 Core Schema, YAML 1.1, Writing Custom Tags. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/07_parsing_yaml.md](yaml/docs/07_parsing_yaml.md) (modified 14 days ago)

Title: Parsing YAML.
It opens by stating: <!-- prettier-ignore --> If you're interested only in the final output, [`parse()`](#yaml-parse) will directly produce native JavaScript If you'd like to retain the comments and other metadata, [`parseDocument()` and `parseAllDocuments()`](#parsing-documents) will produce Document instances that allow for further processing. Key sections include: Lexer, Parser, CST Nodes, Counting Lines. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/08_errors.md](yaml/docs/08_errors.md) (modified 14 days ago)

Title: Errors.
It opens by stating: Nearly all errors and warnings produced by the `yaml` parser functions contain the following fields: | Member | Type | Description | | ------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |. Key sections include: Silencing Errors and Warnings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/09_cli.md](yaml/docs/09_cli.md) (modified 14 days ago)

Title: Command-line Tool.
It opens by stating: Available as `npx yaml` or `npm exec yaml`: <pre id="cli-help" style="float: none; clear: none"> yaml: A command-line YAML processor and inspector. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/10_yaml_syntax.md](yaml/docs/10_yaml_syntax.md) (modified 14 days ago)

Title: YAML Syntax.
It opens by stating: A YAML _schema_ is a combination of a set of tags and a mechanism for resolving non-specific tags, i.e. Key sections include: Tags, Version Differences, Changes from YAML 1.1 to 1.2, Changes from YAML 1.0 to 1.1. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/docs/CONTRIBUTING.md](yaml/docs/CONTRIBUTING.md) (modified 14 days ago)

Title: Contributing to `yaml`.
It opens by stating: The YAML spec is somewhat complicated, and `yaml` tries its best to make it as easy as possible to work with it. Key sections include: Getting Started, Repository Directory & File Structure, Contributing Code. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a contribution guide entry within this repository.

## [yaml/docs/README.md](yaml/docs/README.md) (modified 14 days ago)

Title: README.
It opens by stating: These documentation source files are compiled into [eemeli.org/yaml](https://eemeli.org/yaml) using a [Slate](https://github.com/slatedocs/slate) instance that's a git submodule of this repo at `docs-slate/`. Key sections include: YAML Docs, How to Preview Changes, How to Publish Changes. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/docs/SECURITY.md](yaml/docs/SECURITY.md) (modified 14 days ago)

Title: Security Policy.
It opens by stating: Security updates will be provided for the most recent minor v1 and v2 releases of `yaml`. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a security policy entry within this repository.

## [yaml/docs/index.html.md](yaml/docs/index.html.md) (modified 14 days ago)

Title: index.html.
It opens by stating: --- title: YAML toc_footers:. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.

## [yaml/playground/README.md](yaml/playground/README.md) (modified 14 days ago)

Title: Browser Playground for `yaml`.
It opens by stating: This repository fulfills multiple related needs: 1. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/json-test-suite/README.md](yaml/tests/json-test-suite/README.md) (modified 14 days ago)

Title: JSON Parsing Test Suite.
It opens by stating: A comprehensive test suite for RFC 8259 compliant JSON parsers This repository was created as an appendix to the article [Parsing JSON is a Minefield 💣](http://seriot.ch/parsing_json.php). It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/json-test-suite/parsers/test_JSON.awk/README.md](yaml/tests/json-test-suite/parsers/test_JSON.awk/README.md) (modified 14 days ago)

Title: README.
It opens by stating: JSON.awk ======== A practical JSON parser written in awk. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/json-test-suite/parsers/test_elixir_jason/README.md](yaml/tests/json-test-suite/parsers/test_elixir_jason/README.md) (modified 14 days ago)

Title: TestElixirJason.
It opens with a brief note that sets the context. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/json-test-suite/parsers/test_erlang_euneus/README.md](yaml/tests/json-test-suite/parsers/test_erlang_euneus/README.md) (modified 14 days ago)

Title: TestErlangEuneus.
It opens with a brief note that sets the context. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/json-test-suite/parsers/test_ocaml_orsetto/README.md](yaml/tests/json-test-suite/parsers/test_ocaml_orsetto/README.md) (modified 14 days ago)

Title: README.
It opens by stating: Building ======== `opam install ocamlbuild orsetto`. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/json-test-suite/parsers/test_ocaml_yojson/README.md](yaml/tests/json-test-suite/parsers/test_ocaml_yojson/README.md) (modified 14 days ago)

Title: README.
It opens by stating: Building ======== `opam install ocamlbuild yojson`. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/json-test-suite/parsers/test_scala_dijon_0.3.0/README.md](yaml/tests/json-test-suite/parsers/test_scala_dijon_0.3.0/README.md) (modified 14 days ago)

Title: README.
It opens by stating: Install JDK and sbt, then run following command. Key sections include: To build from sources, To run. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/yaml-test-suite/ReadMe.md](yaml/tests/yaml-test-suite/ReadMe.md) (modified 14 days ago)

Title: ReadMe.
It opens by stating: YAML Test Suite =============== Comprehensive Test Suite for YAML. Key sections include: Overview, Usage, Special Characters, The `data` branch files. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a overview entry within this repository.

## [yaml/tests/yaml-test-suite/doc/tag-usage.md](yaml/tests/yaml-test-suite/doc/tag-usage.md) (modified 14 days ago)

Title: tag-usage.
It opens by stating: Test Suite Tags =============== The .tml files under the `test/` directory have a tags line that looks like. It is organized as a short set of notes without explicit section headings. The content provides details, constraints, or examples tied to the topic. Overall, it serves as a reference for yaml work. It is best read as a documentation note entry within this repository.
