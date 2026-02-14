# Manim editor demo

This folder contains:

- `extract-components.mjs`: [Puppeteer](https://pptr.dev/) screenshot + nested component extraction.
- `editor_component_scene.py`: [Manim](https://www.manim.community/) scene and reusable focus function.
- `component_crop_sequence_scene.py`: one-by-one centered component crops
  with fade-in/fade-out transitions.

## Coordinate convention

- `x`, `y` are the top-left corner in screenshot pixels.
- `w`, `h` are width and height in screenshot pixels.
- Origin is the screenshot top-left.
- `innerComponents` uses the same absolute screenshot coordinate space.
- Components can be declared in markup with
  `data-component="ComponentName-InstanceName"`.
- `svelteComponent` is emitted when `data-component` is present.
- Non-Svelte entries are limited to form fields (`input`, `select`,
  `textarea`, `button`).
- `name` is made unique by suffixing duplicates (`Name`, `Name_2`, `Name_3`).
- `path` is a name-based tree path (`Root.Child.GrandChild`) built from
  unique names.
- `componentType` is:
  - input type for `input` fields (for example `text`, `checkbox`),
  - tag name for other form fields (`select`, `textarea`, `button`),
  - Svelte component name when `svelteComponent` exists.

## Run extractor

From repo root:

```bash
bun manim/extract-components.mjs \
  --url http://localhost:5173/editor \
  --width 1920 \
  --height 1080 \
  --dpr 1 \
  --screenshot manim/output/editor-1920x1080.jpg \
  --output manim/output/editor-components.json \
  --report manim/output/editor-components.txt
```

`dpr` means `deviceScaleFactor`. Keep `1` for exact 1920x1080 pixels.
Use `2` if you want sharper images and larger pixel coordinates.
The extractor also writes an aligned text table report:
`manim/output/editor-components.txt`.
Each row has:

- component `path`
- component `name`
- `componentType` (input type or Svelte component name)
- component `w x h`

## Render movie

```bash
manim -qh -o editor-demo.mp4 manim/editor_component_scene.py EditorComponentDemo
```

Or from Python:

```python
from manim.editor_component_scene import render_editor_demo

render_editor_demo(output_file="editor-demo.mp4", quality="h", preview=False)
```

## Render crop sequence

```bash
manim -qh -o editor-components-sequence.mp4 \
  manim/component_crop_sequence_scene.py \
  ComponentCropSequence
```

This scene crops each extracted component from the source screenshot and
shows each crop centered in turn with `FadeIn -> hold -> FadeOut`.
