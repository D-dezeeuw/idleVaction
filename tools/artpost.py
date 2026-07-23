#!/usr/bin/env python3
"""tools/artpost.py — post-process raw genart PNGs into the shipped WebPs.

    pip install pillow          # the only requirement (python3 is already assumed by npm run serve)
    python3 tools/artpost.py postcards | passport | stamps | all

Raw 1024px PNGs from tools/genart.mjs are gitignored; this script writes the committed WebPs
next to them (same basename). Idempotent — reprocessing overwrites the WebP from the PNG.

- postcards: assets/img/postcards/tier-*.png  -> 760px square WebP q82 (display max-width 380 = 2x)
- passport:  cover.png -> 3:4 portrait center-crop, 570x760; inside.png -> 4:3 landscape
             center-crop, 960x720 (the spread the stamp overlay sits on)
- stamps:    assets/img/passport/stamps/*.png -> ink-only transparent WebP: alpha is a soft ramp
             on distance-from-white, so the white paper becomes transparent exactly like a real
             stamp only deposits ink (interior paper gaps stay transparent too), then trimmed to
             the ink bounding box + 8px pad and resized to max 256px.
- polaroids: assets/img/polaroids/beat-*.png -> 640px square WebP q82 (diary page photos)
- stickers:  assets/img/stickers/*.png -> die-cut transparent WebP: flood-fill from the edges
             against the corner-sampled background color (NOT distance-from-white, so the
             sticker's white border survives), trim + pad, max 320px.
- extras:    story/property/island/era one-offs -> square WebP at per-dir sizes.
"""
import sys, glob, os
from collections import deque
from PIL import Image

PC = 'assets/img/postcards'
PP = 'assets/img/passport'
ST = 'assets/img/passport/stamps'


def save(im, png, **kw):
    out = png[:-4] + '.webp'
    im.save(out, 'WEBP', quality=82, method=6, **kw)
    print(f'{out}  {os.path.getsize(out) / 1024:.0f} KB')


def postcards():
    for f in sorted(glob.glob(f'{PC}/tier-*.png')):
        save(Image.open(f).convert('RGB').resize((760, 760), Image.LANCZOS), f)


def passport():
    f = f'{PP}/cover.png'
    if os.path.exists(f):
        im = Image.open(f).convert('RGB')
        w, h = im.size                      # center-crop 3:4 portrait
        cw = int(h * 3 / 4)
        save(im.crop(((w - cw) // 2, 0, (w + cw) // 2, h)).resize((570, 760), Image.LANCZOS), f)
    f = f'{PP}/inside.png'
    if os.path.exists(f):
        im = Image.open(f).convert('RGB')
        w, h = im.size                      # center-crop 4:3 landscape
        ch = int(w * 3 / 4)
        save(im.crop((0, (h - ch) // 2, w, (h + ch) // 2)).resize((960, 720), Image.LANCZOS), f)


def stamps():
    # alpha = soft ramp on Chebyshev distance from white: <=LO fully clear, >=HI fully opaque.
    LO, HI = 20, 60
    for f in sorted(glob.glob(f'{ST}/*.png')):
        im = Image.open(f).convert('RGB')
        px = im.load()
        w, h = im.size
        a = Image.new('L', (w, h))
        ap = a.load()
        for y in range(h):
            for x in range(w):
                r, g, b = px[x, y]
                d = max(255 - r, 255 - g, 255 - b)
                ap[x, y] = 0 if d <= LO else 255 if d >= HI else (d - LO) * 255 // (HI - LO)
        rgba = im.convert('RGBA')
        rgba.putalpha(a)
        box = a.getbbox()                   # trim to the ink + a little breathing room
        if box:
            pad = 8
            box = (max(0, box[0] - pad), max(0, box[1] - pad),
                   min(w, box[2] + pad), min(h, box[3] + pad))
            rgba = rgba.crop(box)
        rgba.thumbnail((256, 256), Image.LANCZOS)
        save(rgba, f, exact=False)


def polaroids():
    for f in sorted(glob.glob('assets/img/polaroids/beat-*.png')):
        save(Image.open(f).convert('RGB').resize((640, 640), Image.LANCZOS), f)


def stickers():
    # Die-cut stickers have WHITE borders, so keying on whiteness would eat them. Instead:
    # sample the background color from the four corners, then flood-fill alpha inward from
    # every edge pixel that matches it (tolerance TOL) — enclosed whites are never reached.
    TOL = 34
    for f in sorted(glob.glob('assets/img/stickers/*.png')):
        im = Image.open(f).convert('RGB')
        px = im.load()
        w, h = im.size
        corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
        bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))   # per-channel median-ish
        near = lambda p: abs(p[0] - bg[0]) <= TOL and abs(p[1] - bg[1]) <= TOL and abs(p[2] - bg[2]) <= TOL
        mask = bytearray(w * h)          # 1 = background (transparent)
        q = deque()
        for x in range(w):
            for y in (0, h - 1):
                if near(px[x, y]) and not mask[y * w + x]: mask[y * w + x] = 1; q.append((x, y))
        for y in range(h):
            for x in (0, w - 1):
                if near(px[x, y]) and not mask[y * w + x]: mask[y * w + x] = 1; q.append((x, y))
        while q:
            x, y = q.popleft()
            for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                if 0 <= nx < w and 0 <= ny < h and not mask[ny * w + nx] and near(px[nx, ny]):
                    mask[ny * w + nx] = 1
                    q.append((nx, ny))
        a = Image.frombytes('L', (w, h), bytes(255 - m * 255 for m in mask))
        rgba = im.convert('RGBA')
        rgba.putalpha(a)
        box = a.getbbox()
        if box:
            pad = 8
            box = (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))
            rgba = rgba.crop(box)
        rgba.thumbnail((320, 320), Image.LANCZOS)
        save(rgba, f, exact=False)


def extras():
    sizes = {'assets/img/story': 640, 'assets/img/property': 640,
             'assets/img/island': 512, 'assets/img/era': 760}
    for d, n in sizes.items():
        for f in sorted(glob.glob(f'{d}/*.png')):
            save(Image.open(f).convert('RGB').resize((n, n), Image.LANCZOS), f)


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
    modes = ('postcards', 'passport', 'stamps', 'polaroids', 'stickers', 'extras', 'all')
    if mode not in modes:
        sys.exit(f'unknown mode "{mode}" — use: ' + ' | '.join(modes))
    for name, fn in [('postcards', postcards), ('passport', passport), ('stamps', stamps),
                     ('polaroids', polaroids), ('stickers', stickers), ('extras', extras)]:
        if mode in (name, 'all'):
            fn()
