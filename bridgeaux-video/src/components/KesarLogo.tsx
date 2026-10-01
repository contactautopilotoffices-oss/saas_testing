import React from 'react';
import { colors, fonts } from '../styles/tokens';

/** The saffron sprig mark of the example bakery (three petals and a stem). */
export const KesarMark: React.FC<{ size: number; color?: string; accent?: string }> = ({
  size,
  color = colors.saffron,
  accent = colors.saffronDeep,
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block' }}>
    <circle cx="24" cy="24" r="23" fill={colors.cream} stroke={color} strokeWidth="1.6" />
    <path d="M24 36 C24 30 24 26 24 20" stroke={accent} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M24 21 C20 18 19 13 22 10 C25 13 26 17 24 21 Z" fill={color} />
    <path d="M24 26 C19 25 15.5 21.5 16 17.5 C20 17.8 23 21 24 26 Z" fill={color} opacity="0.85" />
    <path d="M24 26 C29 25 32.5 21.5 32 17.5 C28 17.8 25 21 24 26 Z" fill={color} opacity="0.85" />
    <path d="M17 36 H31" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

type Props = {
  height: number;
  tone?: 'dark' | 'light';
  showMark?: boolean;
  layout?: 'inline' | 'stacked';
};

/** "Kesar Bakehouse" wordmark: Fraunces serif with a letterspaced sub line. */
export const KesarLogo: React.FC<Props> = ({ height, tone = 'dark', showMark = true, layout = 'inline' }) => {
  const ink = tone === 'dark' ? colors.cocoa : colors.cream;
  const sub = tone === 'dark' ? colors.saffronDeep : colors.saffronSoft;
  if (layout === 'stacked') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: height * 0.12 }}>
        {showMark ? <KesarMark size={height * 0.9} /> : null}
        <div style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: height * 0.62, color: ink, letterSpacing: '-0.01em', lineHeight: 1 }}>
          Kesar
        </div>
        <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: height * 0.17, color: sub, letterSpacing: '0.32em', lineHeight: 1 }}>
          BAKEHOUSE
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: height * 0.28 }}>
      {showMark ? <KesarMark size={height} /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: height * 0.08 }}>
        <div style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: height * 0.5, color: ink, letterSpacing: '-0.01em', lineHeight: 1 }}>
          Kesar Bakehouse
        </div>
        <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: height * 0.16, color: sub, letterSpacing: '0.28em', lineHeight: 1 }}>
          BANDRA · SINCE 2009
        </div>
      </div>
    </div>
  );
};
