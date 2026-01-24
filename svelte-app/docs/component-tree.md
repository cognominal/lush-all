# Component Tree

Generated from Svelte import usage in `svelte-app/src/`.

## Pages

```
src/routes/+page.svelte

src/routes/docs/+page.svelte
├── BreadcrumbBar
├── DocsSearchBar
├── FileTree

src/routes/editor/+page.svelte
├── EditorWorkspace

src/routes/yaml-explore/+page.svelte
├── BreadcrumbBar
├── JsStructurePane
├── TokenYamlPane
├── YamlEditor

```

## Components

```
AcornYamlPanel
└── IndexedYamlPanel

BreadcrumbBar

CommandPalette

DocsSearchBar
└── SearchHistoryDropdown

EditorWorkspace
├── StructuralEditor
│   ├── AcornYamlPanel
│   │   └── IndexedYamlPanel
│   └── BreadcrumbBar
└── SusyYamlInspector
    └── IndexedYamlPanel

IndexedYamlPanel

JsStructurePane

SearchHistoryDropdown

StructuralEditor
├── AcornYamlPanel
│   └── IndexedYamlPanel
└── BreadcrumbBar

SusyYamlInspector
└── IndexedYamlPanel

SvelteDevMenuBar

TokenYamlPane

YamlEditor

FileTree
└── TreeItem
    └── TreeItem

TreeItem
└── TreeItem

+layout
├── CommandPalette
└── SvelteDevMenuBar

```
