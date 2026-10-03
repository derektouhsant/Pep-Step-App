#!/usr/bin/env python3
"""Draw the PepStep mark and write the web and store icon files.

Requires Pillow. Run from the repo root:
  python3 scripts/render-brand-assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
NAVY = (10, 37, 64, 255)
WHITE = (255, 255, 255, 255)
LIGHT = (168, 197, 219, 255)
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
SANS_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"


def draw_mark(size):
    """Full-bleed navy square with a white P and a light-blue step."""
    image = Image.new("RGBA", (size, size), NAVY)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(SERIF, int(size * 0.56))
    text = "P"
    box = draw.textbbox((0, 0), text, font=font)
    text_w = box[2] - box[0]
    text_h = box[3] - box[1]
    x = (size - text_w) / 2 - box[0]
    y = size * 0.34 - text_h / 2 - box[1]
    draw.text((x, y), text, font=font, fill=WHITE)

    step_h = max(6, int(size * 0.045))
    gap = max(4, int(size * 0.018))
    base_y = int(size * 0.74)
    widths = (0.34, 0.48, 0.62)
    for i, ratio in enumerate(widths):
        w = int(size * ratio)
        left = (size - w) / 2
        top = base_y + i * (step_h + gap)
        radius = max(3, step_h // 2)
        draw.rounded_rectangle((left, top, left + w, top + step_h), radius=radius, fill=LIGHT)
    return image


def draw_splash(size=2732):
    image = Image.new("RGBA", (size, size), NAVY)
    mark = draw_mark(int(size * 0.28))
    mx = (size - mark.width) // 2
    my = int(size * 0.30)
    # Square mark sits on the navy field; mask it to a rounded rect.
    radius = int(mark.width * 0.22)
    mask = Image.new("L", mark.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, mark.width, mark.height), radius=radius, fill=255)
    image.paste(mark, (mx, my), mask)

    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(SERIF, int(size * 0.07))
    tag_font = ImageFont.truetype(SANS, int(size * 0.028))
    line_font = ImageFont.truetype(SANS_REG, int(size * 0.022))
    title = "PepStep"
    tag = "Longevity is Movement"
    line = "Put a Pep in Your Step"
    title_box = draw.textbbox((0, 0), title, font=title_font)
    tag_box = draw.textbbox((0, 0), tag, font=tag_font)
    line_box = draw.textbbox((0, 0), line, font=line_font)
    title_y = my + mark.height + int(size * 0.05)
    draw.text(((size - (title_box[2] - title_box[0])) / 2, title_y), title, font=title_font, fill=WHITE)
    tag_y = title_y + (title_box[3] - title_box[1]) + int(size * 0.02)
    draw.text(((size - (tag_box[2] - tag_box[0])) / 2, tag_y), tag, font=tag_font, fill=LIGHT)
    line_y = tag_y + (tag_box[3] - tag_box[1]) + int(size * 0.018)
    draw.text(((size - (line_box[2] - line_box[0])) / 2, line_y), line, font=line_font, fill=WHITE)
    return image


def save_png(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "PNG")
    print(path)


def main():
    icon = draw_mark(1024)
    # icon-only.png is the Capacitor asset input (full-bleed, not a logo on a background).
    save_png(icon, ROOT / "assets" / "icon-only.png")
    save_png(icon.resize((512, 512), Image.Resampling.LANCZOS), ROOT / "public" / "icon-512.png")
    save_png(icon.resize((192, 192), Image.Resampling.LANCZOS), ROOT / "public" / "icon-192.png")
    save_png(icon.resize((180, 180), Image.Resampling.LANCZOS), ROOT / "public" / "apple-touch-icon.png")
    save_png(icon.resize((32, 32), Image.Resampling.LANCZOS), ROOT / "public" / "favicon-32.png")
    save_png(draw_splash(2732), ROOT / "assets" / "splash.png")


if __name__ == "__main__":
    main()
