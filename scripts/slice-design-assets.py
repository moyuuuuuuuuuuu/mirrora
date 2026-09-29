from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "docs" / "design-reference"
GENERATED = ROOT / "docs" / "generated-assets"
OUT = ROOT / "src" / "static" / "design"
OUT.mkdir(parents=True, exist_ok=True)

JOBS = {
    "hero.webp": ("01-home.png", (680, 15, 1380, 552)),
    "home-card-hair.webp": ("01-home.png", (64, 664, 326, 919)),
    "home-card-skin.webp": ("01-home.png", (329, 664, 583, 919)),
    "home-card-outfit.webp": ("01-home.png", (585, 664, 842, 919)),
    "home-card-makeup.webp": ("01-home.png", (845, 664, 1098, 919)),
    "home-profile.webp": ("01-home.png", (1162, 650, 1530, 920)),
    "module-hair.webp": ("02-modules.png", (28, 300, 593, 916)),
    "module-skin.webp": ("02-modules.png", (594, 300, 1231, 590)),
    "module-outfit.webp": ("02-modules.png", (594, 590, 911, 916)),
    "module-makeup.webp": ("02-modules.png", (911, 590, 1231, 916)),
    "module-archive.webp": ("02-modules.png", (1232, 300, 1562, 916)),
    # Clean, text-free crops used behind the profile domain labels.
    "profile-domain-hair.webp": ("02-modules.png", (260, 300, 593, 540)),
    "profile-domain-skin.webp": ("02-modules.png", (850, 300, 1231, 576)),
    "profile-domain-outfit.webp": ("02-modules.png", (780, 590, 911, 916)),
    "profile-domain-makeup.webp": ("02-modules.png", (1090, 590, 1231, 916)),
    # Keep only the clean portrait area. Starting farther right excludes the
    # editorial copy baked into the reference artwork.
    "consultation-side.webp": ("03-preferences.png", (228, 335, 432, 1000)),
    # Only use the clean upper photo area; labels and selection chrome in the
    # reference are rendered by the client instead of being baked into assets.
    "style-natural.webp": ("03-preferences.png", (486, 215, 708, 365)),
    "style-sharp.webp": ("03-preferences.png", (752, 215, 1005, 365)),
    "style-soft.webp": ("03-preferences.png", (1015, 215, 1266, 365)),
    "style-bold.webp": ("03-preferences.png", (1276, 215, 1534, 365)),
    "portrait-original.webp": ("06-result.png", (52, 365, 402, 812)),
    "portrait-result.webp": ("06-result.png", (456, 365, 807, 812)),
    "result-option-1.webp": ("06-result.png", (852, 226, 1074, 448)),
    "result-option-2.webp": ("06-result.png", (1090, 226, 1312, 448)),
    "result-option-3.webp": ("06-result.png", (1327, 226, 1546, 448)),
    "silver-texture.webp": ("07-profile.png", (1195, 218, 1278, 306)),
    "fabric-texture.webp": ("07-profile.png", (1284, 218, 1370, 306)),
    "black-texture.webp": ("07-profile.png", (1372, 218, 1457, 306)),
    "wine-texture.webp": ("07-profile.png", (1462, 218, 1527, 306)),
}

for name, (source, box) in JOBS.items():
    with Image.open(REF / source) as image:
        crop = image.crop(box).convert("RGB")
        crop.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        crop.save(OUT / name, "WEBP", quality=88, method=6)
        print(f"{name}: {crop.width}x{crop.height}")

# Generated contact sheets are kept as source material, then deterministically
# split into four module-specific, text-free UI backgrounds.
for module in ("skin", "outfit", "makeup"):
    with Image.open(GENERATED / f"{module}-options-cn.png") as image:
        width, height = image.size
        for index in range(4):
            left = round(width * index / 4)
            right = round(width * (index + 1) / 4)
            # Trim the narrow separator without losing meaningful content.
            inset = 2 if index else 0
            crop = image.crop((left + inset, 0, right - (2 if index < 3 else 0), height)).convert("RGB")
            crop.thumbnail((700, 700), Image.Resampling.LANCZOS)
            name = f"{module}-style-{index + 1}.webp"
            crop.save(OUT / name, "WEBP", quality=88, method=6)
            print(f"{name}: {crop.width}x{crop.height}")
