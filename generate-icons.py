#!/usr/bin/env python3
"""
Gerador de ícones PWA — Mundo Encantado dos Livros
Gera todos os tamanhos necessários usando apenas Pillow.

Uso:
  pip install Pillow
  python3 generate-icons.py

Coloque o arquivo source_icon.png (qualquer tamanho >= 512px)
na mesma pasta antes de rodar.
"""

from PIL import Image, ImageDraw, ImageFont
import os, math

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
OUTPUT_DIR = "icons"
SOURCE = "source_icon.png"   # substitua pelo seu ícone original

os.makedirs(OUTPUT_DIR, exist_ok=True)

def make_fallback_icon(size):
    """Cria um ícone roxo com emoji 📚 caso não exista source_icon.png"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fundo gradiente simulado (círculo roxo)
    for i in range(size // 2, 0, -1):
        ratio = i / (size // 2)
        r = int(115 * ratio + 79 * (1 - ratio))
        g = int(36  * ratio + 0  * (1 - ratio))
        b = int(234 * ratio + 200 * (1 - ratio))
        draw.ellipse(
            [size//2 - i, size//2 - i, size//2 + i, size//2 + i],
            fill=(r, g, b, 255)
        )

    # Texto emoji
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
                                   int(size * 0.5))
    except:
        font = ImageFont.load_default()

    text = "📚"
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((size - tw) // 2, (size - th) // 2), text, font=font)
    except:
        pass

    return img

if os.path.exists(SOURCE):
    base = Image.open(SOURCE).convert("RGBA")
    print(f"✅ Usando ícone base: {SOURCE} ({base.size[0]}x{base.size[1]})")
else:
    print(f"⚠️  {SOURCE} não encontrado — gerando ícone padrão")
    base = None

for size in SIZES:
    if base:
        img = base.resize((size, size), Image.LANCZOS)
    else:
        img = make_fallback_icon(size)

    path = os.path.join(OUTPUT_DIR, f"icon-{size}x{size}.png")
    img.save(path, "PNG", optimize=True)
    print(f"  ✓ {path}")

print("\n🎉 Ícones gerados em ./icons/")
print("   Coloque a pasta 'icons/' junto com index.html e manifest.json")
