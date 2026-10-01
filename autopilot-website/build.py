#!/usr/bin/env python3
"""Inline index.html + styles.css + main.js into artifact.html.

The multi-file source under assets/ is canonical. artifact.html is a generated
single-file build for hosts that take one self-contained file, and it differs
from the source only where the hosted viewer requires it. Edit the source and
re-run this; never edit artifact.html by hand.
"""
import pathlib

root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text()
css = (root / 'assets/styles.css').read_text()
js = (root / 'assets/main.js').read_text()

body = html.split('<body>', 1)[1].split('</body>', 1)[0]

# Reveal classes are added by script, so nothing sits at opacity 0 at rest.
# Guard anyway, in case a class ever gets hard-coded back into the markup.
body = body.replace(' class="reveal"', '').replace(' reveal"', '"')

# The brand commits to one look, so declare the colour scheme rather than
# leaving it to the host.
css = css.replace(':root{\n  --ink:', ':root{\n  color-scheme:light;\n  --ink:')

# The fixed nav has to clear the phone status bar.
css = css.replace(
    '.nav__inner{max-width:var(--maxw);margin:0 auto;padding:18px var(--pad);',
    '.nav__inner{max-width:var(--maxw);margin:0 auto;padding:18px var(--pad);'
    'padding-top:calc(18px + env(safe-area-inset-top,0px));')
css = css.replace(
    '.mobilenav{display:none;flex-direction:column;gap:4px;padding:8px var(--pad) 28px;',
    '.mobilenav{display:none;flex-direction:column;gap:4px;padding:8px var(--pad) 28px;'
    'max-height:70svh;overflow-y:auto;')

# Cap the hero instead of pinning it to the viewport, so the opening frame
# still shows what follows it.
css = css.replace('.hero{position:relative;min-height:100svh;',
                  '.hero{position:relative;min-height:clamp(620px,88svh,880px);')
css = css.replace('  .hero{min-height:92svh}', '  .hero{min-height:clamp(560px,86svh,760px)}')

out = f"""<title>Autopilot Offices</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sen:wght@400;600;700;800&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
{css}
</style>
{body}
<script>
{js}
</script>
"""
(root / 'artifact.html').write_text(out)
print(f'artifact.html written, {len(out):,} bytes')
