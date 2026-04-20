"""Generate relic and power icons for InvokerMod using Gemini.
Uses invoker.png (Dota 2 official art) as the primary style reference.
"""
import os
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# Primary style reference: official Dota 2 Invoker art
ref_img = Image.open(r"C:\code\slay\assets\invoker.png")

STYLE = (
    "Slay the Spire relic icon style: square icon, "
    "bold graphic design, glowing accent, black vignette border, "
    "no text, detailed fantasy art. "
    "Match the visual style of the provided reference image exactly: "
    "royal blue and white color palette, gold trim, "
    "rich 3D-rendered look with dramatic lighting, dark background. "
)

icons = [
    ("quas_command_stone",   "images/invoker/relics/quas_command_stone.png",
     STYLE + "An icy blue orb gem stone, glowing with cold frost magic, "
             "Dota 2 Quas orb, royal blue crystalline sphere with frost aura"),
    ("wex_command_stone",    "images/invoker/relics/wex_command_stone.png",
     STYLE + "A crackling purple-gold lightning gem stone, electric energy, "
             "Dota 2 Wex orb, swirling gold and violet lightning sphere"),
    ("exort_command_stone",  "images/invoker/relics/exort_command_stone.png",
     STYLE + "A blazing red-orange fire gem stone, burning with intense heat, "
             "Dota 2 Exort orb, brilliant crimson and amber fire sphere"),
    ("aghanims_scepter",     "images/invoker/relics/aghanims_scepter.png",
     STYLE + "Aghanim's Scepter from Dota 2: an ornate golden magical scepter staff "
             "with a glowing blue gem at the top, intricate gold filigree, radiant magical glow"),
    ("aghanims_fragment",    "images/invoker/relics/aghanims_fragment.png",
     STYLE + "A small broken shard of Aghanim's Scepter: glowing blue crystal fragment, "
             "cracked golden edge, magical energy leaking from the broken artifact"),
    ("forge_spirit_power",   "images/invoker/powers/forge_spirit_power.png",
     STYLE + "A fiery elemental spirit made of molten metal and blazing flames, "
             "Dota 2 Forge Spirit power buff icon, compact square icon, "
             "burning orange-red molten creature with glowing eyes"),
]

out_base = r"C:\code\slay\InvokerMod"

for name, rel_path, prompt in icons:
    out_path = os.path.join(out_base, rel_path.replace("/", "\\"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    print(f"Generating: {name}...")
    response = client.models.generate_content(
        model="gemini-3.1-flash-image-preview",
        contents=[prompt, ref_img],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="1:1", image_size="1K"),
        ),
    )

    for part in response.parts:
        if part.inline_data:
            img = part.as_image()
            img.save(out_path, format="PNG")  # Gemini returns JPEG; force PNG
            print(f"  Saved: {out_path}")
            break
    else:
        print(f"  WARN: No image returned for {name}")

# Also copy power icon to the path PowerModel uses: res://images/powers/
import shutil
power_src = os.path.join(out_base, r"images\invoker\powers\forge_spirit_power.png")
power_dst = os.path.join(out_base, r"images\powers\forge_spirit_power.png")
os.makedirs(os.path.dirname(power_dst), exist_ok=True)
shutil.copy2(power_src, power_dst)
print(f"Copied power icon to: {power_dst}")

print("Done!")
