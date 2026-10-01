# Client logos

Drop the official SVG for each client here using these exact filenames. The
page picks them up automatically; no code change is needed.

    mygate.svg      <- needed
    zepto.svg       <- needed
    zerodha.svg     <- present (Simple Icons, CC0)
    myntra.svg      <- needed
    digitide.svg    <- needed
    altruist.svg    <- needed

Requirements:
- SVG, single colour, no embedded raster images
- Trimmed to the mark with no surrounding padding
- Remove hard-coded `fill` attributes so the page can colour it; the page
  applies the client-wall colour and the hover state itself

Any filename still missing falls back to the brand wordmark set in Sen, which
is why the page never shows a broken image. Replacing a wordmark with the real
logo is purely a matter of adding the file.
