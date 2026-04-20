"""Generate Common card portrait sprites for InvokerMod using Gemini.
Uses invoker.png (Dota 2 official art) as the primary style reference.
"""
import os
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
ref_img = Image.open(r"C:\code\slay\assets\invoker.png")

STYLE = (
    "Slay the Spire card portrait style: square icon, dark fantasy art, "
    "detailed painterly style, dramatic lighting, dark background. "
    "Match the visual style of the reference image: "
    "royal blue, white and gold color palette, 3D-rendered look with magical energy. "
    "No text, no borders, centered composition. "
)

cards = [
    # Quas / Ice line
    ("ice_armor",       "冰护甲",   STYLE + "A suit of glistening ice armor forming around a figure, "
                                    "Quas ice magic, royal blue and white, frost crystals, protective shield aura"),
    ("ice_spike",       "冰锥",     STYLE + "A razor-sharp spike of ice magic launching forward, "
                                    "Quas element, bright blue ice crystal projectile, cold magical energy"),
    ("frost_wind",      "寒风",     STYLE + "A swirling vortex of icy wind and frost, "
                                    "Quas ice element, blue-white snowstorm, protective cold aura"),
    ("freeze",          "冻结术",   STYLE + "A powerful freeze spell encasing in thick ice, "
                                    "deep blue ice encasement, solid glacial magic, Quas power"),
    ("frost_shell",     "冰甲",     STYLE + "A persistent icy magical shell power buff, "
                                    "glowing ice crystal armor passive, soft blue glow, Quas passive"),

    # Wex / Lightning line
    ("thunder_strike",  "雷击",     STYLE + "A crackling lightning bolt striking down, "
                                    "Wex lightning element, purple-gold electric arc, intense electrical discharge"),
    ("chain_lightning", "链式闪电", STYLE + "Chain lightning jumping between multiple targets, "
                                    "Wex element, branching electric bolts, gold and violet energy chains"),
    ("swift_mind",      "迅捷之念", STYLE + "A glowing mind speeding through thoughts, "
                                    "Wex agility element, swirling gold energy, speed motion blur effect, card draw"),
    ("wind_stab",       "疾风刺",   STYLE + "A fast wind-enhanced magical stab attack, "
                                    "Wex element, lightning-fast blade of wind, quick strike with electric trail"),
    ("thunder_field",   "雷场",     STYLE + "An electric field power emanating in all directions, "
                                    "Wex passive aura, crackling lightning field, gold-purple electrical energy"),

    # Exort / Fire line
    ("fireball",        "火球",     STYLE + "A blazing fireball of Exort flame magic, "
                                    "Dota 2 Invoker Exort element, intense red-orange fire sphere, burning magical energy"),
    ("flame_burst",     "炎爆",     STYLE + "A massive explosion of fire magic, "
                                    "Exort element, explosive orange-red flame burst, consuming fire"),
    ("scorch",          "焦灼",     STYLE + "A concentrated beam of scorching fire magic, "
                                    "Exort element, focused heat ray, intense burning orange-white flame"),
    ("flame_shield",    "火焰护盾", STYLE + "A shield formed of swirling flames and fire magic, "
                                    "Exort element, protective fire barrier, red-orange flame vortex"),
    ("burning_heart",   "烈焰之心", STYLE + "A burning heart of fire magic power buff, "
                                    "Exort passive, glowing ember heart with flame aura, persistent fire energy"),
]

out_dir = r"C:\code\slay\InvokerMod\images\invoker\cards"
os.makedirs(out_dir, exist_ok=True)

for filename, zh_name, prompt in cards:
    out_path = os.path.join(out_dir, f"{filename}.png")
    print(f"Generating: {zh_name} ({filename})...")

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
            tmp = out_path + ".jpg"
            img.save(tmp)
            Image.open(tmp).save(out_path)
            os.remove(tmp)
            print(f"  Saved: {filename}.png")
            break
    else:
        print(f"  WARN: No image returned for {zh_name}")

print("Done!")
