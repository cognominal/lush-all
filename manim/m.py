from manim import (
    BLUE,
    PI,
    RED,
    Circle,
    Create,
    ReplacementTransform,
    Scene,
    Square,
    config,
)


class MinimalScene(Scene):
    # Build and animate basic shapes.
    def construct(self) -> None:
        # 1. Create a circle
        circle = Circle(color=BLUE)
        circle.set_fill(BLUE, opacity=0.5)

        # 2. Create a square
        square = Square(color=RED)

        # 3. Animation Sequence
        self.play(Create(circle))  # Draw the circle
        self.wait(1)  # Pause for 1 second
        self.play(
            ReplacementTransform(circle, square)
        )  # Morph circle to square
        self.play(square.animate.rotate(PI / 4))  # Rotate 45 degrees
        self.wait(1)
        # Enter OpenGL interactive mode so camera/scene can be manipulated live.
        if "opengl" in str(config.renderer).lower():
            self.interactive_embed()
