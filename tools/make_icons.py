from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1] / "icons"
root.mkdir(parents=True, exist_ok=True)

for size in (16, 32, 48, 128):
    image = Image.new("RGBA", (size, size), (17, 24, 39, 255))
    draw = ImageDraw.Draw(image)
    margin = max(1, size // 8)
    draw.rounded_rectangle((margin, margin, size - margin, size - margin), radius=max(2, size // 6), fill=(34, 197, 94, 255))
    points = [
        (size * 0.42, size * 0.30),
        (size * 0.42, size * 0.70),
        (size * 0.72, size * 0.50),
    ]
    draw.polygon(points, fill=(255, 255, 255, 255))
    image.save(root / f"icon-{size}.png")
