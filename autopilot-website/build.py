#!/usr/bin/env python3
"""Assemble the site from src/ into self-contained pages at the project root.

Each page is written whole, with the stylesheet and script inlined, so it can be
served from any static host and published as an artifact without a build step at
runtime. Edit src/ and re-run; never edit the generated root .html files.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'

CSS = (ROOT / 'assets/styles.css').read_text()
JS = (ROOT / 'assets/main.js').read_text()

# --- the brand commits to one look, and a few things the hosted viewer needs ---
CSS = CSS.replace(':root{\n  --ink:', ':root{\n  color-scheme:light;\n  --ink:')
CSS = CSS.replace(
    '.nav__inner{max-width:var(--maxw);margin:0 auto;padding:18px var(--pad);',
    '.nav__inner{max-width:var(--maxw);margin:0 auto;padding:18px var(--pad);'
    'padding-top:calc(18px + env(safe-area-inset-top,0px));')
CSS = CSS.replace(
    '.mobilenav{display:none;flex-direction:column;gap:4px;padding:8px var(--pad) 28px;',
    '.mobilenav{display:none;flex-direction:column;gap:4px;padding:8px var(--pad) 28px;'
    'max-height:70svh;overflow-y:auto;')
CSS = CSS.replace('.hero{position:relative;min-height:100svh;',
                  '.hero{position:relative;min-height:clamp(620px,88svh,880px);')
CSS = CSS.replace('  .hero{min-height:92svh}', '  .hero{min-height:clamp(560px,86svh,760px)}')

# --- clients: the real mark where we have the file, always with the name ---
CLIENTS = [
    ('MyGate', 'mygate'), ('Zepto', 'zepto'), ('Zerodha', 'zerodha'),
    ('Myntra', 'myntra'), ('Digitide', 'digitide'), ('Altruist', 'altruist'),
]
HAVE_LOGO = {p.stem for p in (ROOT / 'assets/img/clients').glob('*.svg')}


def logo_img(slug, name):
    return ('<img class="clogo" src="assets/img/clients/%s.svg" alt="" aria-hidden="true" '
            'loading="lazy" width="24" height="24">' % slug)


def marquee_item(name, slug):
    mark = logo_img(slug, name) if slug in HAVE_LOGO else ''
    return ('      <span class="client">%s<span class="client__name">%s</span></span>'
            '<i class="sep"></i>\n' % (mark, name))


def wall_cell(name, slug):
    mark = logo_img(slug, name) if slug in HAVE_LOGO else ''
    return ('      <li class="wall__cell"><span class="wall__mark">%s'
            '<span class="wall__name">%s</span></span></li>\n' % (mark, name))


TRUST = (SRC / 'partials/trust.html').read_text().replace(
    '{{MARQUEE}}', '\n' + ''.join(marquee_item(n, s) for n, s in CLIENTS))
WALL = (SRC / 'partials/wall.html').read_text().replace(
    '{{WALLCELLS}}', '\n' + ''.join(wall_cell(n, s) for n, s in CLIENTS))
CTA = (SRC / 'partials/cta.html').read_text()

HEAD = (SRC / 'partials/head.html').read_text()
HEADER = (SRC / 'partials/header.html').read_text()
FOOTER = (SRC / 'partials/footer.html').read_text()

ACTIVE = {
    'solutions.html': 'A_SOLUTIONS', 'locations.html': 'A_LOCATIONS',
    'why-autopilot.html': 'A_WHY', 'case-studies.html': 'A_WORK',
    'about.html': 'A_ABOUT',
}


def meta(body, key, default=''):
    m = re.search(r'<!--%s:(.*?)-->' % key, body)
    return m.group(1).strip() if m else default


built = []
for page in sorted((SRC / 'pages').glob('*.html')):
    body = page.read_text()
    title, desc, slug = meta(body, 'TITLE'), meta(body, 'DESC'), meta(body, 'SLUG')
    body = re.sub(r'<!--(TITLE|DESC|SLUG):.*?-->\n?', '', body)
    body = body.replace('{{TRUST}}', TRUST).replace('{{WALL}}', WALL).replace('{{CTA}}', CTA)

    head = (HEAD.replace('{{TITLE}}', title).replace('{{DESC}}', desc)
                .replace('{{SLUG}}', slug).replace('{{CSS}}', CSS))
    header = HEADER
    # every page except the home page opens on a solid nav, since there is no hero behind it
    header = header.replace('{{NAV_SOLID}}', '' if page.name == 'index.html' else ' is-solid is-static')
    for fname, token in ACTIVE.items():
        header = header.replace('{{%s}}' % token,
                                ' aria-current="page"' if fname == page.name else '')
    out = head + header + body + FOOTER.replace('{{JS}}', JS)
    (ROOT / page.name).write_text(out)
    built.append((page.name, len(out)))

# the published artifact serves this file as the site's front page
(ROOT / 'artifact.html').write_text((ROOT / 'index.html').read_text())
built.append(('artifact.html', len((ROOT / 'artifact.html').read_text())))

for name, size in built:
    print(f'  {name:24} {size/1024:6.1f} KB')
print(f'{len(built)} files written')
