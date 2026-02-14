from __future__ import annotations

import subprocess

from manim import BLUE_D, Create, DEGREES, FadeIn, RED_D, Sphere, ThreeDAxes, ThreeDScene, config


class InteractiveAxesDemo(ThreeDScene):
    # Build a minimal 3D scene and enter interactive embedding in OpenGL mode.
    def construct(self) -> None:
        axes = ThreeDAxes()
        sphere = Sphere(radius=0.6, resolution=(24, 24),
                        fill_opacity=0.8, checkerboard_colors=[BLUE_D, RED_D])
        sphere.shift([1.2, 0.8, 0.6])

        self.set_camera_orientation(phi=65 * DEGREES, theta=-45 * DEGREES)
        self.play(Create(axes), run_time=1.0)
        self.play(FadeIn(sphere), run_time=0.8)
        self.wait(0.3)

        if "opengl" in str(config.renderer).lower():
            self.interactive_embed()


# Render the interactive 3D demo scene through the Manim CLI.
def render_interactive_axes_demo(
    output_file: str,
    quality: str = "l",
    preview: bool = True,
    script_path: str = "manim/3d.py",
    scene_name: str = "InteractiveAxesDemo",
) -> None:
    command = ["manim", f"-q{quality}", "--renderer=opengl"]
    if preview:
        command.append("-p")
    command.extend(["-o", output_file, script_path, scene_name])
    subprocess.run(command, check=True)
