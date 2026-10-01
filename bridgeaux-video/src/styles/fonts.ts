import { continueRender, delayRender, staticFile } from 'remotion';

// Fonts are bundled locally (from @fontsource) so renders never depend on the
// network. Sora + Inter are the fonts bridgeaux.com uses. Fraunces is the
// serif identity of the example bakery. Sora has no rupee sign, so the Inter
// latin-ext subset supplies it through unicode-range.

type FontSpec = { family: string; file: string; weight: string; style?: string; unicodeRange?: string };

const LATIN_EXT_RUPEE = 'U+20B9';

const specs: FontSpec[] = [
  ...['400', '500', '600', '700'].flatMap((w) => [
    { family: 'Inter', file: `fonts/inter-latin-${w}-normal.woff2`, weight: w },
    { family: 'Inter', file: `fonts/inter-latin-ext-${w}-normal.woff2`, weight: w, unicodeRange: LATIN_EXT_RUPEE },
    { family: 'Sora', file: `fonts/sora-latin-${w}-normal.woff2`, weight: w },
  ]),
  { family: 'Fraunces', file: 'fonts/fraunces-latin-500-normal.woff2', weight: '500' },
  { family: 'Fraunces', file: 'fonts/fraunces-latin-600-normal.woff2', weight: '600' },
  { family: 'Fraunces', file: 'fonts/fraunces-latin-700-normal.woff2', weight: '700' },
  { family: 'Fraunces', file: 'fonts/fraunces-latin-500-italic.woff2', weight: '500', style: 'italic' },
];

let loaded = false;

export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Loading fonts');
  Promise.all(
    specs.map((s) => {
      const face = new FontFace(s.family, `url(${staticFile(s.file)}) format('woff2')`, {
        weight: s.weight,
        style: s.style ?? 'normal',
        unicodeRange: s.unicodeRange,
      });
      return face.load().then((f) => {
        (document.fonts as unknown as { add: (font: FontFace) => void }).add(f);
      });
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error('Font loading failed', err);
      continueRender(handle);
    });
};
