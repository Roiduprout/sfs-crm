#!/usr/bin/env python3
"""Génère icon.png (1024x1024) pour l'app SFS CRM."""
from PIL import Image, ImageDraw, ImageFont
import math, os

SIZE = 1024
BG   = (10, 10, 10, 255)        # #0a0a0a
ACCENT = (212, 255, 42, 255)    # #d4ff2a
BLACK  = (0, 0, 0, 255)

img  = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# ── Fond arrondi (rayon 200px) ──
r = 200
draw.rounded_rectangle([0, 0, SIZE-1, SIZE-1], radius=r, fill=BG)

# ── Carré accent incliné (style logo-mark) ──
sq  = 420
cx, cy = SIZE // 2, SIZE // 2
angle = -8   # degrés
half  = sq // 2

# Coins du carré avant rotation
pts = [(-half, -half), (half, -half), (half, half), (-half, half)]
rad = math.radians(angle)
cos_a, sin_a = math.cos(rad), math.sin(rad)

def rot(x, y):
    return (cx + x*cos_a - y*sin_a, cy + x*sin_a + y*cos_a)

rotated = [rot(x, y) for x, y in pts]
draw.polygon(rotated, fill=ACCENT)

# ── Lettre "S" centrée ──
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 280)
except Exception:
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 280)
    except Exception:
        font = ImageFont.load_default()

text = "S"
bbox = draw.textbbox((0, 0), text, font=font)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
tx = cx - tw // 2 - bbox[0]
ty = cy - th // 2 - bbox[1] - 10   # léger offset vertical

draw.text((tx, ty), text, font=font, fill=BLACK)

# ── Sauvegarde ──
out = os.path.join(os.path.dirname(__file__), "icon.png")
img.save(out, "PNG")
print(f"✓ icon.png créé → {out}")
