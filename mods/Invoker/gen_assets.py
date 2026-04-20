"""
Generate/process all static PNG assets for InvokerMod.
- Orbs: circular crop + resize to 100x100
- Character icon (top-left combat): crop invoker.png to 88x88, circular mask
- Char select icon: crop invoker.png to 132x195
- Char select locked: greyscale version of select icon
- Map marker: crop to 49x64
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BASE = "C:/code/slay/InvokerMod"
ASSETS = "C:/code/slay/assets"

def circular_crop(img: Image.Image, size: int) -> Image.Image:
    """Resize img to size×size and apply circular RGBA mask."""
    img = img.convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    return result

def crop_center(img: Image.Image, w: int, h: int) -> Image.Image:
    """Center-crop to w×h."""
    iw, ih = img.size
    # crop a region from the image maintaining aspect, then resize
    target_ratio = w / h
    src_ratio = iw / ih
    if src_ratio > target_ratio:
        # wider than target - crop sides
        new_w = int(ih * target_ratio)
        x = (iw - new_w) // 2
        img = img.crop((x, 0, x + new_w, ih))
    else:
        # taller than target - crop top/bottom (keep upper portion for portraits)
        new_h = int(iw / target_ratio)
        y_offset = int(ih * 0.05)  # slight offset to show face
        img = img.crop((0, y_offset, iw, y_offset + new_h))
    return img.resize((w, h), Image.LANCZOS).convert("RGBA")

def make_outline(img: Image.Image) -> Image.Image:
    """Create a white outline/silhouette version for the icon outline."""
    img = img.convert("RGBA")
    r, g, b, a = img.split()
    # White fill where alpha > 0, keep alpha
    white = Image.new("RGBA", img.size, (255, 255, 255, 255))
    white.putalpha(a)
    return white

def make_locked(img: Image.Image) -> Image.Image:
    """Greyscale + darkened version for locked icon."""
    grey = img.convert("LA")
    grey_rgba = grey.convert("RGBA")
    # darken
    r, g, b, a = grey_rgba.split()
    r = r.point(lambda x: int(x * 0.5))
    g = g.point(lambda x: int(x * 0.5))
    b = b.point(lambda x: int(x * 0.5))
    return Image.merge("RGBA", (r, g, b, a))

# ── 1. Orbs: circular crop 128→100 ──────────────────────────────────────────
print("Processing orbs...")
for name in ["quas_orb", "wex_orb", "exort_orb"]:
    src = f"{BASE}/images/orbs/{name}.png"
    img = Image.open(src).convert("RGBA")
    result = circular_crop(img, 100)
    result.save(src)
    print(f"  {name}: 128x128 → circular 100x100")

# ── 2. invoker.png reference ─────────────────────────────────────────────────
invoker = Image.open(f"{ASSETS}/invoker.png").convert("RGBA")

# ── 3. Top-left combat icon 88x88 ────────────────────────────────────────────
print("Processing character icons...")
icon_dir = f"{BASE}/images/ui/top_panel"
icon = crop_center(invoker, 88, 88)
icon_circ = circular_crop(icon, 88)
icon_circ.save(f"{icon_dir}/character_icon_invoker_character.png")
print("  character_icon_invoker_character.png: 88x88 circular")

outline = make_outline(icon_circ)
outline.save(f"{icon_dir}/character_icon_invoker_character_outline.png")
print("  character_icon_invoker_character_outline.png")

# ── 4. Character select icons 132x195 ────────────────────────────────────────
print("Processing char select icons...")
sel_dir = f"{BASE}/images/packed/character_select"
sel = crop_center(invoker, 132, 195)
sel.save(f"{sel_dir}/char_select_invoker_character.png")
print("  char_select_invoker_character.png: 132x195")

locked = make_locked(sel)
locked.save(f"{sel_dir}/char_select_invoker_character_locked.png")
print("  char_select_invoker_character_locked.png")

# ── 5. Map marker 49x64 ──────────────────────────────────────────────────────
print("Processing map marker...")
marker_dir = f"{BASE}/images/packed/map/icons"
marker = crop_center(invoker, 49, 64)
marker.save(f"{marker_dir}/map_marker_invoker_character.png")
print("  map_marker_invoker_character.png: 49x64")

print("\nDone! All assets generated.")
