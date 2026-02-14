from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from manim import FadeIn, FadeOut, ImageMobject, Scene, Text, WHITE
from manim import config
from PIL import Image


# Store extracted component metadata needed for crop-sequence rendering.
@dataclass(frozen=True)
class CropComponent:
    name: str
    path: str
    caption: str
    x: int
    y: int
    w: int
    h: int
    inner_components: list["CropComponent"]


# Build a CropComponent recursively from extractor JSON data.
def parse_crop_component(raw: dict[str, Any]) -> CropComponent:
    inner_raw = raw.get("innerComponents", [])
    inner = [
        parse_crop_component(item) for item in inner_raw if isinstance(item, dict)
    ]
    return CropComponent(
        name=str(raw.get("name", "Component")),
        path=str(raw.get("path", raw.get("name", "Component"))),
        caption=str(raw.get("caption", raw.get("name", "Component"))),
        x=int(raw.get("x", 0)),
        y=int(raw.get("y", 0)),
        w=int(raw.get("w", 1)),
        h=int(raw.get("h", 1)),
        inner_components=inner,
    )


# Load top-level components from extractor JSON for crop rendering.
def load_crop_components(path: str) -> list[CropComponent]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Expected top-level JSON array of components.")
    return [parse_crop_component(item) for item in data if isinstance(item, dict)]


# Flatten nested components into sequence order for one-by-one playback.
def flatten_crop_components(components: list[CropComponent]) -> list[CropComponent]:
    ordered: list[CropComponent] = []
    for component in components:
        ordered.append(component)
        ordered.extend(flatten_crop_components(component.inner_components))
    return ordered


# Clamp the component crop box to the screenshot dimensions.
def clamp_crop_box(component: CropComponent, image_width: int, image_height: int) -> tuple[int, int, int, int]:
    left = max(0, min(component.x, image_width - 1))
    top = max(0, min(component.y, image_height - 1))
    right = max(left + 1, min(component.x + component.w, image_width))
    bottom = max(top + 1, min(component.y + component.h, image_height))
    return left, top, right, bottom


# Crop and write a temporary component image file used by Manim ImageMobject.
def write_component_crop(
    source: Image.Image,
    component: CropComponent,
    index: int,
    output_dir: Path,
) -> Path:
    left, top, right, bottom = clamp_crop_box(component, source.width, source.height)
    safe_name = "".join(ch if ch.isalnum() or ch in {"_", "-"} else "_" for ch in component.name)
    filename = f"{index:03d}-{safe_name}.png"
    output_path = output_dir / filename
    source.crop((left, top, right, bottom)).save(output_path)
    return output_path


# Render each component crop centered, with fade-in and fade-out transitions.
class ComponentCropSequence(Scene):
    IMAGE_PATH = "manim/output/editor-1920x1080.jpg"
    COMPONENTS_PATH = "manim/output/editor-components.json"
    CROPS_DIR = "manim/output/crops"
    HOLD_SECONDS = 6.0
    FADE_SECONDS = 3.5

    def construct(self) -> None:
        image_path = Path(self.IMAGE_PATH)
        components_path = Path(self.COMPONENTS_PATH)
        crops_dir = Path(self.CROPS_DIR)
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        if not components_path.exists():
            raise FileNotFoundError(f"Components not found: {components_path}")
        crops_dir.mkdir(parents=True, exist_ok=True)

        source = Image.open(image_path).convert("RGB")
        # Keep all component crops at the same pixel-to-scene scale as the full screenshot.
        global_scale = config.frame_width / float(source.width)
        components = flatten_crop_components(load_crop_components(str(components_path)))
        for index, component in enumerate(components):
            crop_path = write_component_crop(source, component, index, crops_dir)
            image = ImageMobject(str(crop_path))
            # Apply a fixed global pixel-to-scene scale without per-component fitting.
            image.width = max(component.w * global_scale, 0.02)
            image.height = max(component.h * global_scale, 0.02)
            image.move_to([0, 0.25, 0])
            caption = Text(component.path, color=WHITE).scale(0.35)
            caption.next_to(image, direction=[0, -1, 0], buff=0.28)
            self.play(FadeIn(image), FadeIn(caption), run_time=self.FADE_SECONDS)
            self.wait(self.HOLD_SECONDS)
            self.play(FadeOut(image), FadeOut(caption), run_time=self.FADE_SECONDS)


# Render the component crop sequence scene to an output movie file.
def render_component_crop_sequence(
    output_file: str,
    quality: str = "h",
    preview: bool = False,
    script_path: str = "manim/component_crop_sequence_scene.py",
    scene_name: str = "ComponentCropSequence",
) -> None:
    command = ["manim", f"-q{quality}"]
    if preview:
        command.append("-p")
    command.extend(["-o", output_file, script_path, scene_name])
    subprocess.run(command, check=True)
