# BridgeAux explainer film

A 60 second, 1920x1080 product film for BridgeAux, built in Remotion.
Six 10 second scenes, each editable on its own, playing as one continuous film.

| Scene | Time | Story beat |
| --- | --- | --- |
| 01 The problem | 0-10s | A real neighbourhood bakery. Online, customers can barely find it. |
| 02 Meet BridgeAux | 10-20s | BridgeAux bridges the gap: everything a business needs to exist and grow online. |
| 03 Tell us about your business | 20-30s | One plain sentence in, a structured business profile out. |
| 04 Digital foundation | 30-40s | Website, domain, business email, Google listing, content and mobile, set up and live. |
| 05 Operate and grow | 40-50s | Customers find, contact, enquire and buy. The owner manages it all in one dashboard. |
| 06 Everything connected | 50-60s | The connected business, then BridgeAux and "Join the Waitlist". |

The example business throughout is **Kesar Bakehouse**, Hill Road, Bandra West, Mumbai
(`src/data/business.ts`). All of its numbers are fictional demonstration data.

## Render

```bash
npm install
# full film
npx remotion render src/index.ts BridgeAuxExplainer out/bridgeaux-explainer.mp4
# then normalise loudness for web delivery (-16 LUFS, -1.5 dBTP)
scripts/finalize.sh out/bridgeaux-explainer.mp4 out/BridgeAux-Explainer-1080p.mp4
# a single scene (includes its slice of the music)
npx remotion render src/index.ts Scene04-DigitalFoundation out/scene04.mp4
# live preview and editing
npx remotion studio src/index.ts
```

If Remotion cannot download its own headless Chrome, point it at a local one:
`REMOTION_BROWSER=/path/to/headless_shell npx remotion render ...`

## Audio

* **Narration**: Kokoro-82M (Apache-2.0), generated locally by `scripts/generate_narration.py`
  (`scripts/setup_tts.sh` installs it). One WAV per line in `public/audio/vo/`; durations
  land in `src/data/narration.json`, and `src/data/timeline.ts` places each line on the
  timeline. Visual beats are keyed off those cues, so voice and picture move together.
  To change how "BridgeAux" is pronounced, edit `BRAND_PHONEMES` in the script and re-run it.
* **Sound design and music**: synthesised by `scripts/generate_audio.py` (fixed seed,
  fully reproducible, no third-party licences). The score ducks under the voice
  automatically (`src/lib/music.ts`).

## Brand

The film is themed on the official BridgeAux logo (`public/brand/bridgeaux-logo.svg`,
taken from bridgeaux.com): blue `#0274EF` (B), green `#04894D` (A), the slate grey bridge,
on clean white. Sora and Inter are the fonts bridgeaux.com uses. The bakery's saffron
palette appears only inside the bakery's own sign, website and photos.

## Structure

```
src/
  Root.tsx, index.ts           compositions: BridgeAuxExplainer + Scenes/*
  compositions/                MainVideo + Scene01..Scene06
  components/                  logo, frames, website, listing, dashboard, ecosystem, audio helpers
  data/                        business.ts (the bakery), timeline.ts + narration.json (voice cues)
  lib/                         motion.ts (easing and helpers), music.ts (ducking)
  styles/                      tokens.ts (colours, type, shadows), fonts.ts (local font loading)
public/
  brand/ fonts/ textures/ audio/{vo,sfx,music}
scripts/
  generate_narration.py  generate_audio.py  extract_logo.py  setup_tts.sh  stills.sh  finalize.sh
```
