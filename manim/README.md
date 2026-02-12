# Manim editor demo

This folder contains:

- `extract-components.mjs`: Puppeteer screenshot + nested component extraction.
- `editor_component_scene.py`: Manim scene and reusable focus function.

## Coordinate convention

- `x`, `y` are the top-left corner in screenshot pixels.
- `w`, `h` are width and height in screenshot pixels.
- Origin is the screenshot top-left.
- `innerComponents` uses the same absolute screenshot coordinate space.

## Run extractor

From repo root:

```bash
bun manim/extract-components.mjs \
  --url http://localhost:5173/editor \
  --width 1920 \
  --height 1080 \
  --dpr 1 \
  --screenshot manim/output/editor-1920x1080.jpg \
  --output manim/output/editor-components.json
```

`dpr` means `deviceScaleFactor`. Keep `1` for exact 1920x1080 pixels.
Use `2` if you want sharper images and larger pixel coordinates.

## Render movie

```bash
manim -qh -o editor-demo.mp4 manim/editor_component_scene.py EditorComponentDemo
```

Or from Python:

```python
from manim.editor_component_scene import render_editor_demo

render_editor_demo(output_file="editor-demo.mp4", quality="h", preview=False)
```
