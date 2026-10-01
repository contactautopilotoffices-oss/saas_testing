// BridgeAux design tokens.
// The whole film is themed on the official logo: BridgeAux blue (the B),
// green (the A) and the slate grey of the bridge, on clean white. The only
// other palette is the example bakery's own brand, used inside its shop sign,
// website and photos.

export const colors = {
  // Brand
  blue: '#0274EF', // logo "B"
  green: '#04894D', // logo "A"
  bridge: '#454F57', // logo bridge
  blueDeep: '#0158C0',
  blueSoft: '#EAF2FE',
  blueTint: '#D6E7FD',
  greenSoft: '#E7F4ED',
  greenTint: '#CDEBDA',

  // Neutrals
  ink: '#152228', // --brand-ink
  inkSoft: '#34434B',
  muted: '#64707A',
  faint: '#9AA4AD',
  paper: '#F8FAFC', // clean, faintly cool white
  sand: '#EEF2F6',
  line: '#E2E7ED',
  lineSoft: '#EDF1F5',
  white: '#FFFFFF',

  // States. Problems use the bridge's slate grey, never an alarm colour.
  warn: '#454F57',
  warnSoft: '#EEF1F4',
  live: '#04894D',

  // Kesar Bakehouse (the example business)
  saffron: '#D9822B',
  saffronDeep: '#B5651B',
  saffronSoft: '#FBEBD7',
  cocoa: '#3A2A22',
  cocoaSoft: '#6B5446',
  cream: '#FFF8EE',
  blush: '#F7E4D6',
  pistachio: '#9CB07A',
} as const;

export const fonts = {
  display: 'Sora, Inter, system-ui, sans-serif',
  ui: 'Inter, system-ui, sans-serif',
  serif: 'Fraunces, Georgia, serif',
} as const;

export const radii = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const shadows = {
  hairline: '0 0 0 1px rgba(21,34,40,0.06)',
  card: '0 1px 2px rgba(21,34,40,0.05), 0 8px 24px rgba(21,34,40,0.07)',
  raised: '0 2px 6px rgba(21,34,40,0.05), 0 24px 60px rgba(21,34,40,0.12)',
  float: '0 8px 20px rgba(21,34,40,0.06), 0 40px 90px rgba(21,34,40,0.16)',
  glowBlue: '0 0 0 1px rgba(2,116,239,0.10), 0 12px 40px rgba(2,116,239,0.18)',
  glowGreen: '0 0 0 1px rgba(4,137,77,0.10), 0 12px 40px rgba(4,137,77,0.16)',
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
  sceneSeconds: 10,
} as const;

export const SCENE_FRAMES = VIDEO.fps * VIDEO.sceneSeconds; // 300
export const TOTAL_FRAMES = SCENE_FRAMES * 6; // 1800
