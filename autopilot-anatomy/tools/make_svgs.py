#!/usr/bin/env python3
"""Generate placeholder artwork for the Autopilot hero and anatomy sections.

Writes SVG into tools/svg/. render.js turns these into PNG and WebP.

Layers share one 1400x900 plan so they stack exactly. They are drawn top down,
and the page tilts and stacks them in CSS 3D, which is what makes the spin and
the exploded view real rather than faked.

These are stand-ins. Replace the files in assets/img/ with final artwork that
keeps the same names and the same 1400x900 plan alignment and nothing else
needs to change.
"""
import math
import pathlib
import random

OUT = pathlib.Path(__file__).parent / 'svg'
OUT.mkdir(exist_ok=True)
random.seed(7)

W, H = 1400, 900

INK = '#15120F'
PAPER = '#F4F0E8'
GOLD = '#B79459'

DEFS = '''
<defs>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="5" dy="8" stdDeviation="5" flood-color="#000" flood-opacity=".38"/>
  </filter>
  <filter id="shs" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="3" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".4"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0"/>
  </filter>
</defs>
'''


def svg(body, w=W, h=H):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
            'viewBox="0 0 %d %d">%s%s</svg>' % (w, h, w, h, DEFS, body))


def rect(x, y, w, h, fill='none', rx=0, stroke=None, sw=1, op=1, filt=None, extra=''):
    s = ' stroke="%s" stroke-width="%s"' % (stroke, sw) if stroke else ''
    f = ' filter="url(#%s)"' % filt if filt else ''
    o = ' opacity="%s"' % op if op != 1 else ''
    return ('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s"%s%s%s %s/>'
            % (x, y, w, h, rx, fill, s, o, f, extra))


def circle(cx, cy, r, fill='none', stroke=None, sw=1, op=1, filt=None):
    s = ' stroke="%s" stroke-width="%s"' % (stroke, sw) if stroke else ''
    f = ' filter="url(#%s)"' % filt if filt else ''
    o = ' opacity="%s"' % op if op != 1 else ''
    return '<circle cx="%s" cy="%s" r="%s" fill="%s"%s%s%s/>' % (cx, cy, r, fill, s, o, f)


def line(x1, y1, x2, y2, stroke, sw=1, op=1, dash=None):
    d = ' stroke-dasharray="%s"' % dash if dash else ''
    o = ' opacity="%s"' % op if op != 1 else ''
    return ('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s"%s%s/>'
            % (x1, y1, x2, y2, stroke, sw, d, o))


def group(inner, extra=''):
    return '<g %s>%s</g>' % (extra, inner)


# ---------------------------------------------------------------- geometry
SLAB = (90, 90, 1220, 720)
FLOOR = (130, 130, 1140, 640)
ROOMS_X = [130, 410, 700, 990, 1270]
ROOM_Y0, ROOM_Y1 = 130, 310

CLUSTER_COLS = [160, 400, 640]
CLUSTER_ROWS = [430, 620]


def chair_positions():
    """Every desk chair, so furniture and people line up exactly."""
    out = []
    for x0 in CLUSTER_COLS:
        for cy in CLUSTER_ROWS:
            for dx in (35, 100, 165):
                out.append((x0 + dx, cy - 70, 'down'))
                out.append((x0 + dx, cy + 72, 'up'))
    return out


# ---------------------------------------------------------------- layer 1
def layer1():
    b = []
    b.append(rect(0, 0, W, H, '#1E1A17', rx=14))
    for gx in range(0, W + 1, 50):
        b.append(line(gx, 0, gx, H, '#2A2622', 1, .9))
    for gy in range(0, H + 1, 50):
        b.append(line(0, gy, W, gy, '#2A2622', 1, .9))
    # neighbouring blocks, so the slab reads as sitting in a place
    for (x, y, w, h) in [(14, 14, 60, 330), (14, 560, 60, 326), (1326, 14, 60, 300),
                         (1326, 440, 60, 220), (160, 14, 300, 56), (800, 14, 420, 56)]:
        b.append(rect(x, y, w, h, '#2B2723', rx=3, stroke='#383229', sw=1))
    # road and kerb below the building
    b.append(rect(0, 836, W, 64, '#171412'))
    b.append(line(0, 868, W, 868, '#5A5248', 2, 1, '26 22'))
    # trees
    for tx in range(180, 1240, 92):
        b.append(circle(tx, 826, 9, '#3B4636', op=.95))
    # slab with a soft contact shadow
    x, y, w, h = SLAB
    b.append(rect(x + 8, y + 12, w, h, '#000', rx=5, op=.45))
    b.append(rect(x, y, w, h, '#A8A196', rx=5, stroke='#CFC8BC', sw=2))
    # structural bay lines on the slab
    for bx in range(x + 140, x + w, 140):
        b.append(line(bx, y + 6, bx, y + 22, '#7C766C', 2))
        b.append(line(bx, y + h - 22, bx, y + h - 6, '#7C766C', 2))
    for by in range(y + 120, y + h, 120):
        b.append(line(x + 6, by, x + 22, by, '#7C766C', 2))
        b.append(line(x + w - 22, by, x + w - 6, by, '#7C766C', 2))
    # location marker
    b.append(circle(1262, 858, 30, 'none', GOLD, 1.5, .55))
    b.append(circle(1262, 858, 15, GOLD))
    b.append(circle(1262, 858, 5, INK))
    # north mark
    b.append('<path d="M60 872 L70 846 L80 872 L70 866 Z" fill="#8A8277"/>')
    return svg(''.join(b))


# ---------------------------------------------------------------- layer 2
def wall(x, y, w, h, fill='#EFEAE0'):
    """A wall with a lifted top edge and a shadow, so it reads as having height."""
    return (rect(x + 7, y + 9, w, h, '#000', op=.34) + rect(x, y, w, h, fill)
            + rect(x, y, w, h, 'none', stroke='#CFC7B9', sw=1))


def glass(x, y, w, h):
    return (rect(x, y, w, h, '#BFD0D2', op=.42) +
            rect(x, y, w, h, 'none', stroke='#E9F1F1', sw=2, op=.9))


def layer2():
    b = []
    fx, fy, fw, fh = FLOOR
    # floor finish
    b.append(rect(fx, fy, fw, fh, '#C9C2B6'))
    # meeting room floors, slightly darker
    for i in range(4):
        b.append(rect(ROOMS_X[i], ROOM_Y0, ROOMS_X[i + 1] - ROOMS_X[i], ROOM_Y1 - ROOM_Y0, '#B8B0A2'))
    # timber lounge
    b.append(rect(920, 490, 350, 280, '#A9794C'))
    for py in range(490, 770, 28):
        b.append(line(920, py, 1270, py, '#8E6038', 1.2, .55))
    for px in range(944, 1270, 110):
        for py in range(490, 770, 56):
            b.append(line(px, py, px, py + 28, '#8E6038', 1, .35))
    # entrance mat
    b.append(rect(130, 700, 150, 70, '#8C857A'))

    # outer walls
    for (x, y, w, h) in [(fx - 8, fy - 8, fw + 16, 16), (fx - 8, fy + fh - 8, fw + 16, 16),
                         (fx - 8, fy - 8, 16, fh + 16), (fx + fw - 8, fy - 8, 16, fh + 16)]:
        b.append(wall(x, y, w, h))
    # glass facade strips on the long sides
    b.append(glass(fx + 120, fy + fh - 5, 420, 10))
    b.append(glass(fx + 640, fy + fh - 5, 360, 10))
    b.append(glass(fx + fw - 5, fy + 120, 10, 160))
    # room partitions
    for vx in (410, 700, 990):
        b.append(wall(vx - 6, ROOM_Y0, 12, ROOM_Y1 - ROOM_Y0))
    # glass front to the meeting rooms, with door gaps
    for (gx0, gx1) in [(130, 330), (420, 620), (710, 910), (1000, 1200)]:
        b.append(glass(gx0, ROOM_Y1 - 4, gx1 - gx0, 8))
    for gx in (333, 624, 913, 1203):
        b.append(rect(gx, ROOM_Y1 - 4, 60, 8, '#8C857A', op=.0))
    # core
    b.append(wall(1050, 330, 220, 140, '#E6E0D4'))
    b.append(rect(1062, 342, 92, 116, '#BDB5A7'))
    b.append(rect(1166, 342, 92, 50, '#BDB5A7'))
    b.append(rect(1166, 404, 92, 54, '#BDB5A7'))
    # columns
    for (cx, cy) in [(400, 520), (630, 520), (860, 520), (400, 700), (630, 700), (860, 700)]:
        b.append(rect(cx - 11 + 5, cy - 11 + 7, 22, 22, '#000', op=.35))
        b.append(rect(cx - 11, cy - 11, 22, 22, '#F4F0E8'))
    return svg(''.join(b))


# ---------------------------------------------------------------- layer 3
def layer3():
    b = []
    fx, fy, fw, fh = FLOOR
    # the systems plane
    b.append(rect(fx - 10, fy - 10, fw + 20, fh + 20, '#E6DFD2', rx=6, op=.05))
    b.append(rect(fx - 10, fy - 10, fw + 20, fh + 20, 'none', rx=6, stroke='#E9E3D6', sw=2, op=.7))
    # corner ticks
    for (x, y, dx, dy) in [(fx - 10, fy - 10, 1, 1), (fx + fw + 10, fy - 10, -1, 1),
                           (fx - 10, fy + fh + 10, 1, -1), (fx + fw + 10, fy + fh + 10, -1, -1)]:
        b.append(line(x, y, x + 36 * dx, y, GOLD, 3))
        b.append(line(x, y, x, y + 36 * dy, GOLD, 3))
    # trunk and branches
    trunk = '#E9E3D6'
    b.append(line(150, 345, 1250, 345, trunk, 4, .95))
    b.append(line(1160, 345, 1160, 330, trunk, 4))
    for bx in (260, 520, 780, 1020):
        b.append(line(bx, 345, bx, 735, trunk, 3, .85))
    for by in (545, 735):
        b.append(line(180, by, 1020, by, trunk, 2, .6, '10 8'))
    # nodes
    nodes = [(260, 735), (520, 735), (780, 735), (1020, 735),
             (260, 545), (520, 545), (780, 545), (1020, 545),
             (260, 345), (520, 345), (780, 345), (1020, 345)]
    for (nx, ny) in nodes:
        b.append(circle(nx, ny, 11, INK, trunk, 3))
        b.append(circle(nx, ny, 3.5, trunk))
    # access points, ringed in gold
    for (ax, ay) in [(330, 470), (590, 470), (850, 470), (330, 670), (590, 670), (850, 670),
                     (270, 220), (560, 220), (845, 220), (1135, 220), (1100, 640)]:
        b.append(circle(ax, ay, 22, 'none', GOLD, 2, .85))
        b.append(circle(ax, ay, 12, 'none', GOLD, 2, .55))
        b.append(circle(ax, ay, 4.5, GOLD))
    # sensors
    for (sx, sy) in [(450, 400), (710, 400), (450, 590), (710, 590), (950, 420), (980, 560)]:
        b.append(rect(sx - 6, sy - 6, 12, 12, 'none', stroke=trunk, sw=2, op=.8))
    # the platform
    b.append(rect(1086, 372, 148, 60, INK, rx=5, stroke=GOLD, sw=2))
    b.append('<text x="1160" y="409" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" '
             'font-size="20" font-weight="600" letter-spacing="5" fill="%s">ATLAS</text>' % GOLD)
    return svg(''.join(b))


# ---------------------------------------------------------------- layer 4
def chair(cx, cy, r=13):
    return circle(cx, cy, r, '#2B2724', '#4A443D', 1.5, filt='shs')


def layer4():
    b = []
    # desks
    for x0 in CLUSTER_COLS:
        for cy in CLUSTER_ROWS:
            b.append(rect(x0, cy - 48, 200, 44, '#B98F63', rx=3, stroke='#8C6A45', sw=1.5, filt='sh'))
            b.append(rect(x0, cy + 4, 200, 44, '#B98F63', rx=3, stroke='#8C6A45', sw=1.5, filt='sh'))
            for dx in (35, 100, 165):
                b.append(rect(x0 + dx - 16, cy - 36, 32, 20, '#2B2724', rx=2))
                b.append(rect(x0 + dx - 16, cy + 16, 32, 20, '#2B2724', rx=2))
    for (cx, cy, _) in chair_positions():
        b.append(chair(cx, cy))
    # meeting rooms
    for i in range(4):
        cx = (ROOMS_X[i] + ROOMS_X[i + 1]) / 2
        cy = 220
        b.append('<ellipse cx="%s" cy="%s" rx="88" ry="38" fill="#C9A276" stroke="#8C6A45" '
                 'stroke-width="2" filter="url(#sh)"/>' % (cx, cy))
        for k in range(8):
            a = k * math.pi / 4 + math.pi / 8
            b.append(chair(round(cx + 112 * math.cos(a), 1), round(cy + 62 * math.sin(a), 1), 11))
    # lounge: rug, sofas, table, planting
    b.append(rect(935, 505, 320, 250, '#E9E1D2', rx=8, op=.96))
    b.append(rect(935, 505, 320, 250, 'none', rx=8, stroke='#C9BFA9', sw=2))
    b.append(rect(955, 520, 210, 66, '#3F3B35', rx=14, filt='sh'))
    b.append(rect(955, 520, 210, 22, '#4A453E', rx=10))
    b.append(rect(955, 675, 210, 66, '#3F3B35', rx=14, filt='sh'))
    b.append(rect(955, 719, 210, 22, '#4A453E', rx=10))
    b.append(rect(1182, 560, 56, 130, '#4B5A48', rx=14, filt='sh'))
    b.append(circle(1070, 630, 46, '#D9CFBE', '#A99C86', 2, filt='sh'))
    b.append(circle(1070, 630, 22, '#B98F63'))
    # plants
    for (px, py, pr) in [(930, 780, 20), (1262, 520, 22), (1262, 760, 20), (150, 160, 18),
                         (1255, 300, 16), (880, 360, 16)]:
        b.append(circle(px, py, pr, '#4F6B47', '#3B5236', 2, filt='shs'))
        b.append(circle(px - 5, py - 4, pr * .55, '#6A8860', op=.9))
    # reception
    b.append('<path d="M150 735 Q150 690 220 690 L330 690 L330 735 Z" fill="#1E1B18" filter="url(#sh)"/>')
    b.append('<path d="M158 727 Q158 700 220 700 L322 700 L322 727 Z" fill="#CDBFAF"/>')
    return svg(''.join(b))


# ---------------------------------------------------------------- layer 5
def person(x, y, ang=0, fill=PAPER, ring=False):
    g = ('<g transform="translate(%s %s) rotate(%s)" filter="url(#shs)">'
         '<ellipse cx="0" cy="0" rx="17" ry="9" fill="%s" stroke="#15120F" stroke-opacity=".25"/>'
         '<circle cx="0" cy="-1" r="8.5" fill="%s" stroke="#15120F" stroke-opacity=".3"/></g>'
         % (x, y, ang, fill, fill))
    if ring:
        g += circle(x, y, 26, 'none', GOLD, 2.5)
    return g


def layer5():
    b = []
    # service route, drawn first so people sit above it
    b.append('<path d="M150 360 L870 360 L870 745 L350 745 L350 560 L150 560 Z" fill="none" '
             'stroke="%s" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round" opacity=".9"/>' % GOLD)
    # seated colleagues
    chairs = chair_positions()
    for i, (cx, cy, d) in enumerate(chairs):
        if i % 3 != 1:
            b.append(person(cx, cy + (4 if d == 'down' else -4), 0 if d == 'down' else 180))
    # meeting rooms
    for i in (0, 2):
        cx = (ROOMS_X[i] + ROOMS_X[i + 1]) / 2
        for k in (0, 2, 4, 5, 7):
            a = k * math.pi / 4 + math.pi / 8
            b.append(person(round(cx + 112 * math.cos(a), 1), round(220 + 62 * math.sin(a), 1),
                            math.degrees(a) + 90))
    # lounge
    for (px, py, ang) in [(1000, 556, 0), (1062, 556, 0), (1000, 705, 180), (1210, 625, 270)]:
        b.append(person(px, py, ang))
    # standing and moving
    for (px, py, ang) in [(1130, 640, 20), (250, 590, 90), (560, 345, 0), (900, 720, 40)]:
        b.append(person(px, py, ang))
    # the facility team, each ringed in gold
    for (px, py, ang) in [(240, 360, 90), (690, 360, 90), (870, 540, 0), (520, 745, 270)]:
        b.append(person(px, py, ang, '#FFFFFF', True))
    # a service cart
    b.append(rect(402, 735, 46, 22, '#1E1B18', rx=3, stroke=GOLD, sw=2, filt='shs'))
    # service touchpoints
    for (tx, ty) in [(330, 330), (610, 330), (900, 330), (1040, 480), (700, 760), (200, 745)]:
        b.append(circle(tx, ty, 9, GOLD))
        b.append(circle(tx, ty, 16, 'none', GOLD, 1.5, .7))
        b.append('<path d="M%s %s l4 4 l8 -9" fill="none" stroke="#15120F" stroke-width="2.4" '
                 'stroke-linecap="round" stroke-linejoin="round"/>' % (tx - 5, ty - 1))
    return svg(''.join(b))


# ---------------------------------------------------------------- textures
TW, TH = 1920, 1080


def concrete():
    b = ['<rect width="%d" height="%d" fill="#8D8982"/>' % (TW, TH),
         '<filter id="c1"><feTurbulence type="fractalNoise" baseFrequency=".008 .012" numOctaves="4" seed="11"/>'
         '<feColorMatrix type="matrix" values="0 0 0 0 .15  0 0 0 0 .14  0 0 0 0 .13  0 0 0 1.1 -.2"/></filter>',
         '<rect width="%d" height="%d" filter="url(#c1)" opacity=".7"/>' % (TW, TH),
         '<filter id="c2"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="5"/>'
         '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter>',
         '<rect width="%d" height="%d" filter="url(#c2)" opacity=".55"/>' % (TW, TH)]
    for gx in range(160, TW, 320):
        for gy in range(120, TH, 360):
            b.append('<circle cx="%d" cy="%d" r="7" fill="#3A3733" opacity=".85"/>' % (gx, gy))
            b.append('<circle cx="%d" cy="%d" r="11" fill="none" stroke="#6E6A63" stroke-width="2" opacity=".6"/>' % (gx, gy))
    for gy in range(360, TH, 360):
        b.append('<line x1="0" y1="%d" x2="%d" y2="%d" stroke="#4F4C47" stroke-width="3" opacity=".7"/>' % (gy, TW, gy))
    return svg(''.join(b), TW, TH)


def timber():
    b = ['<rect width="%d" height="%d" fill="#7A5A3C"/>' % (TW, TH)]
    x = 0
    tones = ['#7A5A3C', '#86643F', '#6F5036', '#8D6A45', '#795839']
    while x < TW:
        w = random.choice([44, 52, 60])
        b.append('<rect x="%d" y="0" width="%d" height="%d" fill="%s"/>' % (x, w, TH, random.choice(tones)))
        b.append('<line x1="%d" y1="0" x2="%d" y2="%d" stroke="#2A1D12" stroke-width="3" opacity=".75"/>' % (x, x, TH))
        x += w
    b.append('<filter id="g1"><feTurbulence type="fractalNoise" baseFrequency=".35 .006" numOctaves="3" seed="4"/>'
             '<feColorMatrix type="matrix" values="0 0 0 0 .08  0 0 0 0 .05  0 0 0 0 .02  0 0 0 1.2 -.25"/></filter>')
    b.append('<rect width="%d" height="%d" filter="url(#g1)" opacity=".75"/>' % (TW, TH))
    b.append('<linearGradient id="tl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".08"/>'
             '<stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>')
    b.append('<rect width="%d" height="%d" fill="url(#tl)"/>' % (TW, TH))
    return svg(''.join(b), TW, TH)


def glass_wall():
    b = ['<linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2B3A3C"/>'
         '<stop offset=".5" stop-color="#1B2426"/><stop offset="1" stop-color="#10161A"/></linearGradient>',
         '<rect width="%d" height="%d" fill="url(#gg)"/>' % (TW, TH),
         '<polygon points="140,0 520,0 -120,%d -500,%d" fill="#fff" opacity=".07"/>' % (TH, TH),
         '<polygon points="760,0 940,0 300,%d 120,%d" fill="#fff" opacity=".05"/>' % (TH, TH),
         '<filter id="gn"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="9"/>'
         '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0"/></filter>',
         '<rect width="%d" height="%d" filter="url(#gn)" opacity=".5"/>' % (TW, TH)]
    for gx in range(0, TW + 1, 480):
        b.append('<rect x="%d" y="0" width="14" height="%d" fill="#0A0C0D"/>' % (gx - 7, TH))
        b.append('<rect x="%d" y="0" width="3" height="%d" fill="#4A5558" opacity=".6"/>' % (gx + 7, TH))
    for gy in range(0, TH + 1, 540):
        b.append('<rect x="0" y="%d" width="%d" height="14" fill="#0A0C0D"/>' % (gy - 7, TW))
    return svg(''.join(b), TW, TH)


if __name__ == '__main__':
    files = {
        'part_1': layer1(), 'part_2': layer2(), 'part_3': layer3(),
        'part_4': layer4(), 'part_5': layer5(),
        'split_1': concrete(), 'split_2': timber(), 'split_3': glass_wall(),
    }
    for name, content in files.items():
        (OUT / (name + '.svg')).write_text(content)
        print('wrote', name + '.svg', '%.1f KB' % (len(content) / 1024))
