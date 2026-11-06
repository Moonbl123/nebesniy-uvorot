#!/usr/bin/env python
# Генерация промо-материалов (иконка 512x512, обложка 800x470) в стиле игры.
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "promo")
os.makedirs(OUT_DIR, exist_ok=True)

FONT_DIR = r"C:\Windows\Fonts"
FONT_BOLD = os.path.join(FONT_DIR, "arialbd.ttf")
FONT_REG = os.path.join(FONT_DIR, "arial.ttf")


def qbez(p0, p1, p2, n=24):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        pts.append((x, y))
    return pts


def sky(w, h):
    img = Image.new("RGB", (w, h))
    top, mid, bot = (16, 22, 56), (27, 36, 82), (44, 42, 94)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        if t < 0.6:
            k = t / 0.6
            c = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
        else:
            k = (t - 0.6) / 0.4
            c = tuple(int(mid[i] + (bot[i] - mid[i]) * k) for i in range(3))
        d.line([(0, y), (w, y)], fill=c)
    rnd = random.Random(42)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for _ in range(70):
        a = int(60 + rnd.random() * 130)
        r = 0.6 + rnd.random() * 1.8
        x, y = rnd.random() * w, rnd.random() * h
        ld.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    return Image.alpha_composite(img.convert("RGBA"), layer)


def star(base, x, y, r, rot):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([x - r * 1.6, y - r * 1.6, x + r * 1.6, y + r * 1.6], fill=(255, 233, 138, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    base.alpha_composite(glow)
    pts = []
    for i in range(10):
        a = (i / 10) * 2 * math.pi - math.pi / 2 + rot
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    d.polygon(pts, fill=(255, 233, 138, 255))
    base.alpha_composite(layer)


def rock(base, x, y, r, rot):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = []
    for i in range(8):
        a = (i / 8) * 2 * math.pi
        rr = r * (0.82 + 0.18 * math.sin(i * 3.7 + rot))
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    d.polygon(pts, fill=(125, 116, 104, 255))
    d.ellipse([x - r * 0.3 - r * 0.22, y - r * 0.2 - r * 0.22,
               x - r * 0.3 + r * 0.22, y - r * 0.2 + r * 0.22], fill=(94, 87, 77, 255))
    d.ellipse([x + r * 0.25 - r * 0.16, y + r * 0.3 - r * 0.16,
               x + r * 0.25 + r * 0.16, y + r * 0.3 + r * 0.16], fill=(94, 87, 77, 255))
    base.alpha_composite(layer)


def rocket_layer(r, tilt_deg=0):
    pad = int(r * 2.4)
    img = Image.new("RGBA", (pad, pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = pad / 2

    flame = r * 1.1
    fg = Image.new("RGBA", (pad, pad), (0, 0, 0, 0))
    fgd = ImageDraw.Draw(fg)
    fgd.polygon([(cx - r * 0.35, cy + r * 0.75), (cx, cy + r * 0.8 + flame),
                 (cx + r * 0.35, cy + r * 0.75)], fill=(255, 150, 60, 220))
    fg = fg.filter(ImageFilter.GaussianBlur(6))
    img.alpha_composite(fg)

    body = []
    body += qbez((cx, cy - r * 1.25), (cx + r * 0.9, cy - r * 0.2), (cx + r * 0.62, cy + r * 0.8))
    body += qbez((cx + r * 0.62, cy + r * 0.8), (cx, cy + r * 0.95), (cx - r * 0.62, cy + r * 0.8))[1:]
    body += qbez((cx - r * 0.62, cy + r * 0.8), (cx - r * 0.9, cy - r * 0.2), (cx, cy - r * 1.25))[1:]
    d.polygon(body, fill=(204, 211, 226, 255))

    nose = []
    nose += qbez((cx, cy - r * 1.25), (cx + r * 0.5, cy - r * 0.75), (cx + r * 0.42, cy - r * 0.55))
    nose += qbez((cx + r * 0.42, cy - r * 0.55), (cx, cy - r * 0.45), (cx - r * 0.42, cy - r * 0.55))[1:]
    nose += qbez((cx - r * 0.42, cy - r * 0.55), (cx - r * 0.5, cy - r * 0.75), (cx, cy - r * 1.25))[1:]
    d.polygon(nose, fill=(255, 107, 94, 255))

    d.ellipse([cx - r * 0.3, cy - r * 0.25 - r * 0.3, cx + r * 0.3, cy - r * 0.25 + r * 0.3],
              fill=(62, 198, 255, 255), outline=(90, 102, 133, 255), width=max(2, int(r * 0.1)))

    d.polygon([(cx - r * 0.6, cy + r * 0.35), (cx - r * 1.05, cy + r * 1.0), (cx - r * 0.55, cy + r * 0.85)],
              fill=(255, 107, 94, 255))
    d.polygon([(cx + r * 0.6, cy + r * 0.35), (cx + r * 1.05, cy + r * 1.0), (cx + r * 0.55, cy + r * 0.85)],
              fill=(255, 107, 94, 255))

    return img.rotate(tilt_deg, resample=Image.BICUBIC, center=(cx, cy))


def glow(base, x, y, radius, color, alpha=80):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(radius / 2.5))
    base.alpha_composite(layer)


# ---------- Иконка 512x512 ----------
icon = sky(512, 512)
star(icon, 90, 90, 26, 0.3)
star(icon, 420, 120, 20, 0.8)
rock(icon, 90, 400, 34, 0.5)
rock(icon, 425, 380, 28, 1.2)
glow(icon, 256, 280, 190, (62, 198, 255), 70)
rl = rocket_layer(70, -9)
icon.alpha_composite(rl, (256 - rl.width // 2, 280 - rl.height // 2))
icon.convert("RGB").save(os.path.join(OUT_DIR, "icon-512.png"))
print("icon-512.png")

# ---------- Обложка 800x470 ----------
cover = sky(800, 470)
star(cover, 90, 80, 24, 0.2)
star(cover, 700, 60, 20, 0.9)
star(cover, 620, 330, 22, 0.5)
rock(cover, 120, 300, 38, 0.7)
rock(cover, 690, 200, 30, 1.4)
rock(cover, 330, 60, 24, 0.2)

d = ImageDraw.Draw(cover)
title_font = ImageFont.truetype(FONT_BOLD, 64)
sub_font = ImageFont.truetype(FONT_REG, 24)

glow(cover, 400, 175, 260, (255, 179, 71), 50)
d = ImageDraw.Draw(cover)
d.text((400, 160), "Небесный уворот", font=title_font, fill=(255, 233, 138, 255), anchor="mm")
d.text((400, 228), "Уклоняйся от метеоритов, собирай звёзды!",
       font=sub_font, fill=(255, 255, 255, 220), anchor="mm")

rl = rocket_layer(52, -6)
cover.alpha_composite(rl, (400 - rl.width // 2, 350 - rl.height // 2))
cover.convert("RGB").save(os.path.join(OUT_DIR, "cover-800x470.png"))
print("cover-800x470.png")
