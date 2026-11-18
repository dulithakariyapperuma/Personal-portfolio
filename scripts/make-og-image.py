"""
Builds the social share card at public/og.png (1200x630).

Run after changing the tagline or picking a different photograph:
    python3 scripts/make-og-image.py

Why a script and not a one-off export: the card has to be regenerated every
time the wording changes, and a hand-made PNG nobody can rebuild is how a
site ends up sharing a tagline it stopped using two years ago.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og.png"
PHOTO = ROOT / "public" / "photography" / "finals" / "img-3927-large.webp"

W, H = 1200, 630
NAVY = (2, 11, 28)
INK = (233, 232, 220)
CYAN = (0, 216, 246)
AMBER = (214, 174, 122)
MUTED = (133, 140, 141)

# Avenir Next stands in for Space Grotesk and Didot for the serif <em> the
# site uses on its headline. Neither webfont is installed locally, and a
# share card is a picture — the substitution is invisible to the reader.
def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)

SANS = "/System/Library/Fonts/Avenir Next.ttc"
SERIF = "/System/Library/Fonts/Supplemental/Didot.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"

card = Image.new("RGB", (W, H), NAVY)

# --- the photograph, bled into the right third ------------------------------
if PHOTO.exists():
    photo = Image.open(PHOTO).convert("RGB")
    # cover-crop to the right panel
    panel_w, panel_h = 560, H
    scale = max(panel_w / photo.width, panel_h / photo.height)
    photo = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS)
    left = (photo.width - panel_w) // 2
    top = (photo.height - panel_h) // 3          # bias upward, faces sit high
    photo = photo.crop((left, top, left + panel_w, top + panel_h))
    card.paste(photo, (W - panel_w, 0))

    # Fade it into the navy instead of butting a hard edge against the type.
    ramp = Image.new("L", (panel_w, 1))
    for x in range(panel_w):
        t = x / (panel_w - 1)
        ramp.putpixel((x, 0), int(255 * max(0.0, 1 - (t / 0.55)) ** 1.25))
    mask = ramp.resize((panel_w, panel_h))
    card.paste(Image.new("RGB", (panel_w, panel_h), NAVY), (W - panel_w, 0), mask)

    # Settle the whole panel back so white shirts don't shout over the type.
    veil = Image.new("RGBA", (panel_w, panel_h), NAVY + (70,))
    card.paste(Image.alpha_composite(
        card.crop((W - panel_w, 0, W, H)).convert("RGBA"), veil).convert("RGB"),
        (W - panel_w, 0))

# --- a cyan wash behind the type, matching the landing page's atmosphere ----
# Only over the left panel: blending across the photograph would grey it out.
glow = Image.new("RGB", (W, H), NAVY)
ImageDraw.Draw(glow).ellipse([-220, 240, 480, 880], fill=(12, 44, 56))
glow = glow.filter(ImageFilter.GaussianBlur(120))
left_panel = (0, 0, W - 560, H)
card.paste(
    Image.blend(card.crop(left_panel), glow.crop(left_panel), 0.55),
    left_panel[:2],
)

draw = ImageDraw.Draw(card)

# --- type -------------------------------------------------------------------
x = 72
draw.text((x, 92), "D U L I T H A   K A R I Y A P P E R U M A",
          font=font(MONO, 17), fill=MUTED)

draw.text((x, 170), "Two ways of seeing.", font=font(SANS, 68), fill=INK)
draw.text((x, 256), "One connected mind.", font=font(SERIF, 70, index=1), fill=INK)

draw.text((x, 384), "I build with code. I compose with light.",
          font=font(SANS, 27), fill=(154, 165, 168))

# the two disciplines, in their own colours
y = 470
draw.rectangle([x, y, x + 3, y + 76], fill=CYAN)
draw.text((x + 22, y + 2), "PROGRAMMING", font=font(MONO, 16), fill=CYAN)
draw.text((x + 22, y + 30), "Reason. Plan. Connect.", font=font(SANS, 22), fill=(176, 186, 188))

x2 = x + 300
draw.rectangle([x2, y, x2 + 3, y + 76], fill=AMBER)
draw.text((x2 + 22, y + 2), "PHOTOGRAPHY", font=font(MONO, 16), fill=AMBER)
draw.text((x2 + 22, y + 30), "Notice. Compose. Capture.", font=font(SANS, 22), fill=(176, 186, 188))

OUT.parent.mkdir(parents=True, exist_ok=True)
card.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT.relative_to(ROOT)}  {OUT.stat().st_size // 1024} kB  {W}x{H}")
