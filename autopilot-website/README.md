# Autopilot Offices — website

Static homepage for Autopilot Offices. No build step: open `index.html`, or run
`python3 -m http.server` from this folder.

```
autopilot-website/
  index.html          homepage
  assets/styles.css   design tokens + all styling
  assets/main.js      hero slideshow, nav, lifecycle tabs, scroll reveal
  assets/img/         logo variants and photography
```

## Design direction

Black / white / grey foundation with a restrained champagne accent (`--gold: #B79459`)
used only on CTAs, dividers, numerals and hover states. Sen for display, Montserrat for
body, per the brand guidelines. The triangle cut from the Autopilot "A" is reused as the
list marker and checklist tick.

All colour, type and spacing values live as CSS custom properties at the top of
`assets/styles.css`. Change them there, not inline.

## Homepage structure

1. Hero — full-bleed photo slideshow with headline, offering chooser and two CTAs
2. Trust strip — client marquee directly under the hero
3. Workspace lifecycle — tabbed, one partner across all four stages
4. Day 1 Standard
5. ATLAS
6. AI spotlight
7. Locations
8. Case studies
9. People
10. Closing CTA + footer

## What still needs real material

Anything marked `data-slot` in `index.html` is a placeholder holding the layout, not
approved copy. Nothing on this page invents a client, a number, a quote or a credential.

- **Case studies** — challenge / role / outcome for MyGate, Zepto and Digitide
- **People** — leadership and team photographs, names and roles
- **Locations** — real workspace photography, city and building names, availability
- **Business highlights** — verified figures (cities, workspaces delivered, seats, area, years)
- **Testimonials** — video and written, with real faces
- **Client logos** — vector files to replace the text wordmarks in the trust strip
- **Hero video** — the brief calls for a video-led hero; the slideshow is the interim
  treatment and the same markup takes a `<video>` with a poster frame

## Accessibility and performance

- Single stylesheet, single script, no framework or external JS
- `prefers-reduced-motion` stops the slideshow, the marquee and every transition
- Slideshow pauses when the tab is hidden
- Skip link, labelled tablists, visible focus, semantic landmarks
