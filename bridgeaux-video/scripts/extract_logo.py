"""Regenerate src/components/brand/logoPaths.ts from the official SVG."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
svg = (ROOT / "public/brand/bridgeaux-logo.svg").read_text()
paths = re.findall(r'<path d="([^"]+)" fill="(#[0-9A-F]+)"', svg)
assert len(paths) == 3, "expected B, A and bridge paths"
lines = [
    "// Generated from public/brand/bridgeaux-logo.svg (the official BridgeAux mark,",
    "// fetched from bridgeaux.com). Do not edit by hand: re-run scripts/extract_logo.py.",
    "",
    "export const LOGO_VIEWBOX = { width: 1342, height: 894 };",
    "// Tight bounds of the artwork inside the original viewBox",
    "export const LOGO_BOUNDS = { x: 88, y: 116, width: 1166, height: 630 };",
    "",
    "export const LOGO_PATHS = {",
]
for name, (d, fill) in zip(["b", "a", "bridge"], paths):
    lines.append(f'  {name}: {{ fill: "{fill}", d: "{d}" }},')
lines.append("} as const;")
(ROOT / "src/components/brand/logoPaths.ts").write_text("\n".join(lines) + "\n")
print("wrote logoPaths.ts")
